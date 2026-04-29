import { Link } from 'react-router-dom';

export default function HRQuickActions({ onAction }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <button
        type="button"
        onClick={() => onAction('CREATE_USER')}
        className="bg-white rounded-xl p-6 card-hover group text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Create User</h3>
            <p className="text-purple-500 text-sm">Add a new employee account</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onAction('CREATE_JOB')}
        className="bg-white rounded-xl p-6 card-hover group text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Create Job Posting</h3>
            <p className="text-purple-500 text-sm">Post a new job opportunity</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </button>

      <Link
        to="/hiring/jobs"
        className="bg-white rounded-xl p-6 card-hover group block"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Manage Job Postings</h3>
            <p className="text-purple-500 text-sm">View and edit all postings</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => onAction('MANAGE_DEPTS')}
        className="bg-white rounded-xl p-6 card-hover group text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Manage Departments</h3>
            <p className="text-purple-500 text-sm">View and edit departments</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}
