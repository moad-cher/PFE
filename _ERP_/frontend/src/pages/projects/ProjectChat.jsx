import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject } from '../../api';
import ChatWindow from '../../components/features/chat/ChatWindow';

export default function ProjectChat() {
  const { pk } = useParams();
  const [project, setProject] = useState(null);
  useEffect(() => { getProject(pk).then(r => setProject(r.data)); }, [pk]);
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name || 'Project'}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Chat</span>
      </div>
      {project && (
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {project.name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{project.name}</p>
            <p className="text-xs text-gray-400">{project.members?.length || 0} members</p>
          </div>
        </div>
      )}
      <ChatWindow roomType="project" pk={pk} />
    </div>
  );
}
