import { Link } from 'react-router-dom';

const KANBAN_STATUS_COLORS = {
  review: '#3498db',
};

export default function PMProjectsList({ projects, overview, user }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
        <Link
          to="/projects/new"
          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          No projects yet
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {projects.map((project) => {
            const projectOverview = overview?.projects?.find(p => p.id === project.id);
            const completionRate = projectOverview?.completion_rate || 0;
            const isManager = project.manager?.id === user?.id;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block bg-white rounded-xl shadow-lilac border border-purple-100/30 p-5 card-hover group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 truncate transition-colors">
                        {project.name}
                      </h3>
                      {isManager && (
                        <span className="flex-shrink-0 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                          Manager
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  {completionRate > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2.5 py-0.5 flex-shrink-0">
                      {completionRate}%
                    </span>
                  )}
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%`, backgroundColor: KANBAN_STATUS_COLORS.review }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-100/50 text-xs text-gray-400">
                  <span>{project.tasks_count ?? projectOverview?.total_tasks ?? 0} tasks</span>
                  <span>{project.members_count ?? 0} members</span>
                  <span>{projectOverview?.completed_tasks ?? 0} completed</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
