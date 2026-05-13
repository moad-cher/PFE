import React, { useMemo, useRef } from 'react';

const SHIFTS = [
  { start: [8, 30], end: [13, 0] }, // Morning
  { start: [14, 0], end: [17, 0] }  // Evening
];

export default function TimelineSlider({ sprintStart, sprintEnd, valueStart, valueEnd, isEdit, onChange }) {
  const scrollRef = useRef(), trackRef = useRef(), scrollTimer = useRef();

  // 1. Generate Sprint Days
  const days = useMemo(() => {
    const res = [], curr = new Date(sprintStart), end = new Date(sprintEnd);
    while (curr <= end) { res.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    return res;
  }, [sprintStart, sprintEnd]);

  const total = days.length * 2;

  // 1.5 Calculate minIdx for new tasks
  const minIdx = useMemo(() => {
    if (isEdit) return 0;
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv');
    const dayIdx = days.findIndex(d => d.toLocaleDateString('sv') === todayStr);
    if (dayIdx === -1) {
        return now < new Date(days[0]) ? 0 : total;
    }
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const morningStart = 8 * 60 + 30;
    const afternoonStart = 14 * 60;
    const grace = 30; // 30 minutes grace

    if (currentTime >= 17 * 60) return (dayIdx + 1) * 2;
    if (currentTime >= afternoonStart + grace) return (dayIdx + 1) * 2; 
    if (currentTime >= morningStart + grace) return dayIdx * 2 + 1;
    return dayIdx * 2;
  }, [days, isEdit, total]);

  // 2. Mapping Helpers
  const toISO = (idx, isEnd) => {
    const d = new Date(days[Math.floor(idx / 2)]);
    const [h, m] = isEnd ? SHIFTS[idx % 2].end : SHIFTS[idx % 2].start;
    d.setHours(h, m, 0, 0);
    return d.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
  };

  const toIdx = (iso) => {
    if (!iso) return isEdit ? 0 : minIdx;
    const d = new Date(iso), ds = iso.split('T')[0];
    const day = days.findIndex(x => x.toLocaleDateString('sv') === ds);
    return Math.max(0, day) * 2 + (d.getHours() >= 14 ? 1 : 0);
  };

  const sIdx = Math.max(isEdit ? 0 : minIdx, toIdx(valueStart));
  const eIdx = Math.max(sIdx, toIdx(valueEnd));

  // 3. Compact Interaction Logic
  const move = (clientX, type) => {
    const rect = trackRef.current.getBoundingClientRect();
    let slot = Math.floor(((clientX - rect.left) / rect.width) * total);
    slot = Math.max(isEdit ? 0 : minIdx, Math.min(total - 1, slot));

    let ns = sIdx, ne = eIdx;
    if (type === 'start') ns = Math.min(slot, eIdx);
    else if (type === 'end') ne = Math.max(slot, sIdx);
    else Math.abs(slot - sIdx) < Math.abs(slot - eIdx) ? (ns = Math.min(slot, eIdx)) : (ne = Math.max(slot, sIdx));
    
    onChange(toISO(ns, 0), toISO(ne, 1));
  };

  const onDown = (e, type) => {
    e.stopPropagation();
    const handle = (m) => {
      const r = scrollRef.current.getBoundingClientRect();
      clearInterval(scrollTimer.current);
      if (m.clientX < r.left + 40) scrollTimer.current = setInterval(() => { scrollRef.current.scrollLeft -= 8; move(m.clientX, type); }, 16);
      else if (m.clientX > r.right - 40) scrollTimer.current = setInterval(() => { scrollRef.current.scrollLeft += 8; move(m.clientX, type); }, 16);
      move(m.clientX, type);
    };
    const stop = () => { clearInterval(scrollTimer.current); window.removeEventListener('mousemove', handle); window.removeEventListener('mouseup', stop); };
    window.addEventListener('mousemove', handle);
    window.addEventListener('mouseup', stop);
    handle(e);
  };

  if (!days.length) return null;

  return (
    <div className="w-full select-none mb-6 overflow-x-auto pb-4 custom-scrollbar" ref={scrollRef}>
      <div style={{ minWidth: days.length * 80 }} className="relative px-2 pt-6">
        <div className="absolute top-0 left-2 right-2 flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Sprint Start</span><span>Sprint End</span>
        </div>

        <div ref={trackRef} className="relative h-12 bg-gray-100 rounded-xl border border-gray-200 cursor-pointer" onMouseDown={e => onDown(e, 'jump')}>
          {/* Past Slots Overlay */}
          {!isEdit && minIdx > 0 && (
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gray-400/20 z-10 pointer-events-none rounded-l-xl border-r border-gray-300"
              style={{ width: `${(minIdx / total) * 100}%` }}
            />
          )}

          {/* Track Grid: Weekends & Markers */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
            {days.map((d, i) => (d.getDay() % 6 === 0) && (
              <div key={i} className="bg-gray-200/50" style={{ gridColumn: `${i*2 + 1} / span 2` }} />
            ))}
            {Array.from({ length: total + 1 }).map((_, i) => (
              <div
                key={i}
                className={`h-full ${i % 2 ? 'bg-gray-300 w-px' : 'bg-gray-400 w-[2px]'}`}
                style={{ gridColumnStart: i + 1 }}
              />
            ))}
          </div>

          {/* Active Range */}
          <div className="absolute top-0 bottom-0 bg-purple-50 opacity-30 border-y-2 border-purple-500 z-10" 
               style={{ left: `${(sIdx/total)*100}%`, width: `${((eIdx-sIdx+1)/total)*100}%` }} />

          {/* Handles */}
          {[sIdx, eIdx + 1].map((idx, i) => (
            <div key={i} className="absolute top-[-4px] bottom-[-4px] w-4 bg-purple-600 rounded-md z-20 shadow-lg flex items-center justify-center cursor-ew-resize"
                 style={{ left: `calc(${(idx/total)*100}% - 8px)` }} onMouseDown={e => onDown(e, i ? 'end' : 'start')}>
              <div className="w-0.5 h-3 bg-white/40 rounded-full" />
            </div>
          ))}
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-2">
          {days.map((d, i) => {
            const isToday = d.toLocaleDateString('sv') === new Date().toLocaleDateString('sv');
            return (
              <div key={i} className="flex-1 text-center">
                <div className={`text-[10px] font-bold mb-1 ${isToday ? 'text-purple-600' : d.getDay()%6===0?'text-gray-300':'text-gray-500'}`}>
                  {d.toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <div className="flex justify-center">
                  <div className={`
                    text-[10px] w-6 h-6 flex items-center justify-center rounded-full transition-colors
                    ${isToday ? 'bg-purple-600 text-white font-black shadow-sm' : 'text-gray-400 opacity-70'}
                  `}>
                    {d.getDate()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
