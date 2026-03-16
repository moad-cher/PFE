import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLeaderboard, getProject } from '../../api';
import Spinner from '../../components/Spinner';

export default function Leaderboard() {
  const { pk } = useParams();
  const [project, setProject] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLeaderboard(pk), getProject(pk)])
      .then(([b, p]) => { setBoard(b.data); setProject(p.data); })
      .finally(() => setLoading(false));
  }, [pk]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Leaderboard</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h1>
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['#', 'Member', 'Points'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {board.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 py-10">No data yet</td></tr>
            )}
            {board.map(entry => (
              <tr key={entry.user_id} className={entry.rank === 1 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4">
                  <span className={`font-bold text-sm ${entry.rank === 1 ? 'text-yellow-600' : entry.rank === 2 ? 'text-gray-500' : 'text-gray-400'}`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{entry.full_name || entry.username}</p>
                  <p className="text-xs text-gray-400">@{entry.username}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-sm font-semibold">
                    {entry.reward_points} pts
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
