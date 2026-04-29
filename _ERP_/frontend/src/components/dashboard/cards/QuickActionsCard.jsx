export default function QuickActionsCard({ onAction }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full">
      <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <button
          onClick={() => onAction('CREATE_USER')}
          className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Create New User</p>
            <p className="text-xs text-gray-500">Add a new team member</p>
          </div>
        </button>
        <button
          onClick={() => onAction('MANAGE_DEPTS')}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Manage Departments</p>
            <p className="text-xs text-gray-500">View and edit departments</p>
          </div>
        </button>
      </div>
    </div>
  );
}
