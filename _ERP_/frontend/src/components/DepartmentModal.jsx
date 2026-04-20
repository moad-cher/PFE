import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Spinner from './Spinner';

const initialDepartmentForm = {
  name: '',
  description: '',
};

export default function DepartmentModal({ open, onClose, departments, users, onRefresh }) {
  const [localDepartments, setLocalDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Multi-select state
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // CRUD states
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(initialDepartmentForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (open) {
      setLocalDepartments(departments || []);
      setAllUsers(users || []);
      setError('');
      setSuccessMessage('');
      setEditingDepartment(null);
      setIsCreating(false);
      setForm(initialDepartmentForm);
      setDeleteConfirm(null);
      setSelectedUserIds([]);
    }
  }, [open, departments, users]);

  if (!open) return null;

  const getDepartmentUsers = (deptId) => {
    return allUsers.filter(u => u.department?.id === deptId);
  };

  const getUnassignedUsers = () => {
    return allUsers.filter(u => !u.department);
  };

  const handleUserClick = (e, userId, containerUsers) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedUserIds(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else if (e.shiftKey && selectedUserIds.length > 0) {
      // Range selection
      const lastSelectedId = selectedUserIds[selectedUserIds.length - 1];
      const currentIndex = containerUsers.findIndex(u => u.id === userId);
      const lastIndex = containerUsers.findIndex(u => u.id === lastSelectedId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = containerUsers.slice(start, end + 1).map(u => u.id);
        
        setSelectedUserIds(prev => {
          const others = prev.filter(id => !rangeIds.includes(id));
          return [...others, ...rangeIds];
        });
      } else {
        setSelectedUserIds([userId]);
      }
    } else {
      // Single selection
      setSelectedUserIds([userId]);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const draggedUserId = parseInt(draggableId.replace('user-', ''));

    // Dropped in same location
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Determine which users are being moved
    let usersToMove = [draggedUserId];
    if (selectedUserIds.includes(draggedUserId)) {
      usersToMove = [...selectedUserIds];
    }

    // Determine new department
    let newDepartmentId = null;
    let newDeptObj = null;
    if (destination.droppableId !== 'unassigned') {
      newDepartmentId = parseInt(destination.droppableId.replace('dept-', ''));
      newDeptObj = localDepartments.find(d => d.id === newDepartmentId);
    }

    // Update state optimistically
    setAllUsers(prev => prev.map(u => 
      usersToMove.includes(u.id) ? { ...u, department: newDeptObj } : u
    ));
    
    // Clear selection after drag
    setSelectedUserIds([]);

    try {
      const { adminAssignDepartment } = await import('../api');
      // Process all users in parallel
      await Promise.all(usersToMove.map(uid => adminAssignDepartment(uid, newDepartmentId)));
      
      setSuccessMessage(`${usersToMove.length} user(s) moved`);
      setTimeout(() => setSuccessMessage(''), 2000);
      onRefresh?.();
    } catch (err) {
      setError('Failed to update users: ' + (err.response?.data?.detail || 'Unknown error'));
      onRefresh?.();
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Department name is required');
      return;
    }

    setLoading(true);
    try {
      const { createDepartment } = await import('../api');
      await createDepartment({ name: form.name.trim(), description: form.description.trim() });
      setSuccessMessage('Department created');
      setIsCreating(false);
      setForm(initialDepartmentForm);
      onRefresh?.();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setError('Failed to create department: ' + (err.response?.data?.detail || 'Unknown error'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !editingDepartment) return;

    setLoading(true);
    try {
      const { updateDepartment } = await import('../api');
      await updateDepartment(editingDepartment.id, {
        name: form.name.trim(),
        description: form.description.trim()
      });
      setSuccessMessage('Department updated');
      setEditingDepartment(null);
      setForm(initialDepartmentForm);
      onRefresh?.();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setError('Failed to update department: ' + (err.response?.data?.detail || 'Unknown error'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    try {
      const { deleteDepartment } = await import('../api');
      await deleteDepartment(deleteConfirm.id);
      setSuccessMessage('Department deleted');
      setDeleteConfirm(null);
      onRefresh?.();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setError('Failed to delete department: ' + (err.response?.data?.detail || 'Unknown error'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (dept) => {
    setEditingDepartment(dept);
    setForm({ name: dept.name, description: dept.description || '' });
  };

  const openDeleteModal = (dept) => {
    setDeleteConfirm(dept);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-purple-100/50 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-departments-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 id="manage-departments-title" className="text-xl font-semibold text-gray-900">
              Manage Departments
            </h3>
            <p className="text-sm text-gray-600">Drag and drop users between departments</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Department
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        {(error || successMessage) && (
          <div className="px-6 py-3">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                {successMessage}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Unassigned Users Column */}
              <Droppable droppableId="unassigned">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 min-h-[200px]"
                  >
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
                      <span>Unassigned ({getUnassignedUsers().length})</span>
                    </h4>
                    <div className="space-y-2">
                      {getUnassignedUsers().map((user, index) => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <Draggable key={`user-${user.id}`} draggableId={`user-${user.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={(e) => handleUserClick(e, user.id, getUnassignedUsers())}
                                className={`bg-white rounded-lg px-3 py-2 shadow-sm border cursor-grab active:cursor-grabbing hover:border-purple-300 transition-colors ${
                                  isSelected ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200'
                                } ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 relative">
                                  {snapshot.isDragging && isSelected && selectedUserIds.length > 1 && (
                                    <div className="absolute -top-4 -right-4 bg-purple-600 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white z-50">
                                      {selectedUserIds.length}
                                    </div>
                                  )}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs ${
                                    isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'
                                  }`}>
                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                                      {user.first_name} {user.last_name}
                                    </p>
                                    <p className={`text-xs truncate ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>@{user.username}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {getUnassignedUsers().length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">No unassigned users</p>
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Department Columns */}
              {localDepartments.map((dept, index) => {
                const deptUsers = getDepartmentUsers(dept.id);
                return (
                  <Droppable key={dept.id} droppableId={`dept-${dept.id}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="bg-white rounded-xl border border-gray-200 p-4 min-h-[200px] flex flex-col"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">
                            {dept.name}
                            <span className="ml-2 text-xs font-normal text-gray-500">({deptUsers.length})</span>
                          </h4>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(dept)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit department"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openDeleteModal(dept)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete department"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {dept.description && (
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{dept.description}</p>
                        )}
                        <div className="flex-1 space-y-2">
                          {deptUsers.map((user, userIndex) => {
                            const isSelected = selectedUserIds.includes(user.id);
                            return (
                              <Draggable key={`user-${user.id}`} draggableId={`user-${user.id}`} index={userIndex}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={(e) => handleUserClick(e, user.id, deptUsers)}
                                    className={`bg-gray-50 rounded-lg px-3 py-2 border cursor-grab active:cursor-grabbing hover:border-purple-300 transition-colors ${
                                      isSelected ? 'border-purple-500 bg-purple-100 ring-1 ring-purple-500' : 'border-gray-200'
                                    } ${
                                      snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 relative">
                                      {snapshot.isDragging && isSelected && selectedUserIds.length > 1 && (
                                        <div className="absolute -top-4 -right-4 bg-purple-600 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white z-50">
                                          {selectedUserIds.length}
                                        </div>
                                      )}
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs ${
                                        isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'
                                      }`}>
                                        {user.first_name?.[0]}{user.last_name?.[0]}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                                          {user.first_name} {user.last_name}
                                        </p>
                                        <p className={`text-xs truncate ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>@{user.username}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {deptUsers.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">
                              Drop users here
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {localDepartments.length} department(s) • {allUsers.filter(u => u.department).length} user(s) assigned
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>

      {/* Create Department Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsCreating(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Create Department</h4>
            </div>
            <form onSubmit={handleCreateDepartment} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Engineering"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60"
                >
                  {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDepartment && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEditingDepartment(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">Edit Department</h4>
            </div>
            <form onSubmit={handleUpdateDepartment} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDepartment(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60"
                >
                  {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-red-600">Delete Department</h4>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              </p>
              {getDepartmentUsers(deleteConfirm.id).length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> This department has {getDepartmentUsers(deleteConfirm.id).length} user(s).
                    They will be moved to "Unassigned" when you delete this department.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteDepartment}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
