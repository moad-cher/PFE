import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, getProjectStatuses, getSprints, createSprint, updateSprint, formatDate } from '../../api';
import Spinner from '../../components/ui/Spinner';
import PriorityBadge from '../../components/ui/PriorityBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { isProjectManager } from '../../utils/permissions';
import TaskNew from './TaskNew';

export default function ScrumBoard() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalSprintId, setTaskModalSprintId] = useState('');

  const fetchData = () => {
    Promise.all([getProject(pk), getProjectStatuses(pk), getSprints(pk)])
      .then(([p, s, spr]) => {
        setProject(p.data);
        setStatuses(s.data);
        setSprints(spr.data.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [pk]);

  const openTaskModal = (sprintId = '') => {
    setTaskModalSprintId(sprintId);
    setShowTaskModal(true);
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      const res = await createSprint(pk, sprintForm);
      setSprints([...sprints, res.data].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
      setShowSprintModal(false);
      setSprintForm({ name: '', start_date: '', end_date: '', goal: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create sprint');
    }
  };

  const handleUpdateSprintStatus = async (sprintId, newStatus) => {
    try {
      const res = await updateSprint(pk, sprintId, { status: newStatus });
      setSprints(sprints.map(s => s.id === sprintId ? res.data : s));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update sprint');
    }
  };
  
  const allMembers = project
    ? [project.manager, ...(project.members || [])]
        .filter(Boolean)
        .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
    : [];

  // Grouping logic
  const tasksBySprint = {};
  sprints.forEach(s => tasksBySprint[s.id] = []);
  const backlogTasks = [];

  project?.tasks?.forEach(t => {
    // Apply filters
    if (filterStatus && t.status !== filterStatus) return;
    if (filterAssignee && !t.assigned_to?.some(a => a.id === parseInt(filterAssignee))) return;

    if (t.sprint_id && tasksBySprint[t.sprint_id]) {
      tasksBySprint[t.sprint_id].push(t);
    } else {
      backlogTasks.push(t);
    }
  });

  const renderTaskTable = (taskList) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
          <tr>
            <th className="px-4 py-2 font-semibold">Task</th>
            <th className="px-4 py-2 font-semibold">Status</th>
            <th className="px-4 py-2 font-semibold text-center">Pts</th>
            <th className="px-4 py-2 font-semibold">Assignees</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {taskList.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 italic">No tasks assigned</td></tr>
          ) : (
            taskList.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-2">
                  <Link to={`/projects/${pk}/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">{t.title}</Link>
                </td>
                <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2 text-center">
                   <span className="text-gray-500">{t.points}</span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex -space-x-2">
                    {t.assigned_to?.map(u => (
                      <div key={u.id} title={u.username} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700">
                        {u.username[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
            <span>/</span><span className="font-medium text-gray-700">Scrum Roadmap</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sprint Timeline</h1>
        </div>
        <div className="flex gap-3">
          {isProjectManager(user, project) && (
            <button onClick={() => setShowSprintModal(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
              New Sprint
            </button>
          )}
          <button onClick={() => openTaskModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
            + New Task
          </button>
        </div>
      </div>

      <TaskNew 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        pk={pk} 
        initialSprintId={taskModalSprintId} 
        onSuccess={fetchData} 
      />

      {/* Global Filters */}
      <div className="flex flex-wrap gap-4 mb-12 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Filters:</span>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          className="border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm">
          <option value="">All members</option>
          {allMembers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
        </select>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-gray-200 to-transparent"></div>

        <div className="space-y-16">
          {sprints.map((sprint, idx) => {
            const isActive = sprint.status === 'active';
            const isCompleted = sprint.status === 'completed';
            
            return (
              <div key={sprint.id} className={`relative pl-12 md:pl-20 transition-all ${isActive ? 'scale-[1.02]' : ''}`}>
                {/* Node Dot */}
                <div className={`absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 bg-white z-10 top-2 transition-all duration-500
                  ${isActive ? 'border-indigo-600 scale-150 ring-4 ring-indigo-100' : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                </div>

                {/* Sprint Card */}
                <div className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-indigo-100 shadow-xl' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${isActive ? 'bg-indigo-50/50' : isCompleted ? 'bg-gray-50/50' : ''}`}>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{sprint.name}</h3>
                        {isActive && <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">Current</span>}
                        {isCompleted && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Completed</span>}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isProjectManager(user, project) && sprint.status === 'draft' && (
                        <button onClick={() => handleUpdateSprintStatus(sprint.id, 'active')} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">Start Sprint</button>
                      )}
                      {isProjectManager(user, project) && sprint.status === 'active' && (
                        <button onClick={() => handleUpdateSprintStatus(sprint.id, 'completed')} className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">Complete</button>
                      )}
                      <button onClick={() => openTaskModal(sprint.id)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        + Task
                      </button>
                      <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-gray-900">{tasksBySprint[sprint.id]?.length || 0} Tasks</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total {tasksBySprint[sprint.id]?.reduce((acc, t) => acc + t.points, 0) || 0} Pts</div>
                      </div>
                    </div>
                  </div>

                  {sprint.goal && (
                    <div className="px-6 py-2 bg-amber-50/30 border-y border-amber-100/50">
                      <p className="text-xs text-amber-800 italic leading-relaxed"><span className="font-bold mr-1">Goal:</span>{sprint.goal}</p>
                    </div>
                  )}

                  <div className="p-2 sm:p-4">
                    {renderTaskTable(tasksBySprint[sprint.id] || [])}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Backlog Section */}
          <div className="relative pl-12 md:pl-20">
            {/* Node Dot for Backlog */}
            <div className="absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-dashed border-gray-300 bg-white z-10 top-2"></div>
            
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-dashed border-gray-300 flex items-center justify-between bg-gray-100/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-600 italic">Project Backlog</h3>
                  <button onClick={() => openTaskModal()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    + Task
                  </button>
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase">{backlogTasks.length} unassigned tasks</span>
              </div>
              <div className="p-2 sm:p-4 opacity-75">
                {renderTaskTable(backlogTasks)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Sprint Modal (Unchanged) */}
      {showSprintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20">
            <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Setup New Sprint</h3>
            <form onSubmit={handleCreateSprint} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sprint Identifier</label>
                <input required type="text" value={sprintForm.name} onChange={e => setSprintForm({...sprintForm, name: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Q2 - Performance Optimization" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kickoff</label>
                  <input required type="date" value={sprintForm.start_date} 
                    onChange={e => {
                      const start = e.target.value;
                      let end = sprintForm.end_date;
                      if (start && project?.config?.sprint_duration_days) {
                        const d = new Date(start);
                        d.setDate(d.getDate() + project.config.sprint_duration_days);
                        end = d.toISOString().split('T')[0];
                      }
                      setSprintForm({...sprintForm, start_date: start, end_date: end});
                    }}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                  <div className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm text-gray-700">
                    {sprintForm.end_date ? formatDate(sprintForm.end_date) : '—'}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Core Objective</label>
                <textarea rows="3" value={sprintForm.goal} onChange={e => setSprintForm({...sprintForm, goal: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="What's the main goal?" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowSprintModal(false)} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Dismiss</button>
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Initialize Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
