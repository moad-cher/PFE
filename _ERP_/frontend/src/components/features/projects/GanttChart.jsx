import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

const DAY_WIDTH = 44;
const TASK_HEIGHT = 28;

function MiniGantt({ tasks, startDate, endDate, statuses, project_id }) {
  const minDate = new Date(startDate);
  const maxDate = new Date(endDate);
  // Add 1 day buffer to end date to ensure the bar fits
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

  const getX = (dateStr) => {
    const d = new Date(dateStr);
    const normalizedD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const normalizedMin = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return Math.floor((normalizedD - normalizedMin) / (1000 * 60 * 60 * 24)) * DAY_WIDTH;
  };

  const today = new Date();
  const todayX = getX(today);
  const showToday = today >= minDate && today <= maxDate;

  // Row packing algorithm
  const rows = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const startA = new Date(a.start_time || a.created_at);
      const startB = new Date(b.start_time || b.created_at);
      return startA - startB;
    });

    const packedRows = [];
    sortedTasks.forEach(task => {
      const start = new Date(task.start_time || task.created_at);
      const end = new Date(task.end_time || (start.getTime() + 86400000));
      
      let rowIndex = packedRows.findIndex(row => {
        const lastTask = row[row.length - 1];
        const lastEnd = new Date(lastTask.end_time || (new Date(lastTask.start_time || lastTask.created_at).getTime() + 86400000));
        return start >= lastEnd;
      });

      if (rowIndex === -1) {
        packedRows.push([task]);
      } else {
        packedRows[rowIndex].push(task);
      }
    });
    return packedRows;
  }, [tasks]);

  const statusColorMap = useMemo(() => {
    const map = {};
    statuses.forEach(s => map[s.slug] = s.color);
    return map;
  }, [statuses]);

  return (
    <div className="relative overflow-x-auto scrollbar-hide select-none" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
      {/* Grid Days */}
      <div className="flex border-b border-gray-100 bg-gray-50/30">
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = new Date(minDate);
          d.setDate(d.getDate() + i);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} style={{ width: `${DAY_WIDTH}px` }} className={`h-6 flex items-center justify-center text-[9px] font-bold border-r border-gray-100/50 flex-shrink-0 ${isToday ? 'text-red-500 bg-red-50/30' : isWeekend ? 'bg-gray-100/40 text-gray-300' : 'text-gray-400'}`}>
              {d.getDate()}
            </div>
          );
        })}
      </div>

      <div className="relative py-2" style={{ height: `${Math.max(3, rows.length) * (TASK_HEIGHT + 6)}px` }}>
        {/* Today Marker */}
        {showToday && (
          <div className="absolute top-0 bottom-0 w-px bg-red-400/50 z-20 pointer-events-none" style={{ left: `${todayX}px` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 absolute top-0 -left-[2.5px]"></div>
          </div>
        )}

        {rows.map((row, rIdx) => (
          <React.Fragment key={rIdx}>
            {row.map(task => {
              const start = task.start_time || task.created_at;
              const end = task.end_time || (new Date(new Date(start).getTime() + 86400000).toISOString());
              const startX = getX(start);
              const endX = getX(end);
              const width = Math.max(DAY_WIDTH * 0.8, endX - startX);
              const color = statusColorMap[task.status] || '#94a3b8';

              return (
                <div key={task.id} className="absolute flex items-center group transition-all" style={{ left: `${startX}px`, top: `${rIdx * (TASK_HEIGHT + 6)}px`, width: `${width}px` }}>
                  <Link
                    to={`/projects/${project_id}/tasks/${task.id}`}
                    className="h-6 w-full rounded-md shadow-sm border border-black/5 hover:brightness-110 flex items-center px-1.5 overflow-hidden transition-all"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-white text-[9px] font-bold truncate leading-none drop-shadow-sm">
                      {task.title}
                    </span>
                  </Link>
                  <div className="absolute left-full flex -space-x-1 pl-1 items-center pointer-events-none group-hover:z-50">
                    {task.assigned_to?.map(u => (
                      <div key={u.id} className="w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[7px] font-black text-gray-700 shadow-sm uppercase">
                        {u.username[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
        {tasks.length === 0 && <div className="h-full flex items-center justify-center text-[10px] text-gray-300 italic uppercase font-bold tracking-widest">Empty Space</div>}
      </div>
    </div>
  );
}

export default function GanttChart({ tasks, sprints, statuses, project_id, onAddTask }) {
  const sortedSprints = useMemo(() => 
    [...(sprints || [])].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  , [sprints]);

  const tasksBySprint = useMemo(() => {
    const map = {};
    (sprints || []).forEach(s => map[s.id] = []);
    const backlog = [];
    (tasks || []).forEach(t => {
      if (t.sprint_id && map[t.sprint_id]) map[t.sprint_id].push(t);
      else backlog.push(t);
    });
    return { map, backlog };
  }, [tasks, sprints]);

  return (
    <div className="w-full">
      <div className="flex overflow-x-auto pb-6 gap-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {sortedSprints.map(sprint => {
          const isActive = sprint.status === 'active';
          return (
            <div 
              key={sprint.id} 
              className={`flex-shrink-0 bg-white rounded-3xl border transition-all 
                ${isActive ? 'border-indigo-500 shadow-xl shadow-indigo-100 ring-1 ring-indigo-500/20' : 'border-gray-100 shadow-sm hover:border-gray-200'}`}
              style={{ minWidth: '320px' }}
            >
              {/* Card Header */}
              <div className={`px-6 py-4 rounded-t-3xl flex items-center justify-between ${isActive ? 'bg-indigo-50/50' : 'bg-gray-50/30'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">{sprint.name}</h4>
                    {isActive && <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded-full uppercase">Active</span>}
                    <button onClick={() => onAddTask && onAddTask(sprint.id)} className="p-1 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-[10px] font-bold px-2" title="Add Task to Sprint">
                      + task
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400">
                    {new Date(sprint.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(sprint.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-gray-900">{tasksBySprint.map[sprint.id].length} Tasks</div>
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{tasksBySprint.map[sprint.id].reduce((acc, t) => acc + (t.points || 0), 0)} Points</div>
                </div>
              </div>

              {/* Card Body - Mini Gantt */}
              <div className="p-4 overflow-hidden">
                <MiniGantt 
                  tasks={tasksBySprint.map[sprint.id]} 
                  startDate={sprint.start_date} 
                  endDate={sprint.end_date} 
                  statuses={statuses}
                  project_id={project_id}
                />
              </div>

              {sprint.goal && (
                <div className="px-6 py-3 border-t border-gray-50 bg-amber-50/20 rounded-b-3xl">
                  <p className="text-[10px] text-amber-800 italic leading-tight"><span className="font-bold mr-1">Goal:</span>{sprint.goal}</p>
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
