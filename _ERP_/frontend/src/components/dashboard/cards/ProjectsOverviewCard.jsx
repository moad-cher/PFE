export default function ProjectsOverviewCard({ projects, onProjectClick }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Projects Overview</h2>
        <p className="text-sm text-gray-600 mt-1">Status and progress of all active projects</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const totalTasks = project.tasks?.length || 0;
            const completedTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return (
              <div 
                key={project.id} 
                onClick={() => onProjectClick(project.id)}
                className="group cursor-pointer p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all shadow-sm hover:shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{project.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Manager: {project.manager?.first_name} {project.manager?.last_name}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">
                    {progress}%
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{completedTasks}/{totalTasks} tasks</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex -space-x-2 overflow-hidden">
                  {project.members?.slice(0, 5).map(m => (
                    <div key={m.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold" title={m.username}>
                      {m.username[0]?.toUpperCase()}
                    </div>
                  ))}
                  {project.members?.length > 5 && (
                    <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                      +{project.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {projects.length === 0 && (
          <div className="text-center py-10 text-gray-500">No projects found.</div>
        )}
      </div>
    </div>
  );
}
