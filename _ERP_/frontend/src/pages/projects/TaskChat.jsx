import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTask, getProject } from '../../api';
import ChatWindow from '../../components/features/chat/ChatWindow';

export default function TaskChat() {
  const { pk, taskId } = useParams();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  useEffect(() => {
    Promise.all([getTask(pk, taskId), getProject(pk)])
      .then(([t, p]) => { setTask(t.data); setProject(p.data); });
  }, [pk, taskId]);
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span>
        <Link to={`/projects/${pk}/tasks/${taskId}`} className="hover:text-blue-600 truncate max-w-xs">{task?.title || 'Task'}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Chat</span>
      </div>
      {task && (
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">#</div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
            <p className="text-xs text-gray-400">Sub-group · {project?.name}</p>
          </div>
        </div>
      )}
      <ChatWindow roomType="task" pk={taskId} />
    </div>
  );
}
