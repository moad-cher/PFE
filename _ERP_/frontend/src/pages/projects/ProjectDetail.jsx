import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getProject, deleteProject, getKanban } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { canManageProjects } from '../../auth/permissions';
import Spinner from '../../components/shared/ui/Spinner';
import DashboardChartCard from '../../components/shared/cards/DashboardChartCard';
import { CHART_COLORS, CHART_TYPES } from '../../components/shared/cards/DashboardChartRegistry';
import GanttChart from '../../components/features/projects/GanttChart';
import TaskEdit from '../../components/features/projects/TaskEdit';
import ProjectEditModal from '../../components/features/projects/ProjectEditModal';
import ProjectSettingsModal from '../../components/features/projects/ProjectSettingsModal';

// Tab Components
import KanbanBoard from './KanbanBoard';
import ScrumBoard from './ScrumBoard';
import Members from './Members';
import Leaderboard from './Leaderboard';
import ProjectChat from './ProjectChat';

function QuickCard({ id, icon, label, color, active, onClick, isCollapsed, activeClasses }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active
          ? (activeClasses || 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100')
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${isCollapsed ? 'justify-center px-2' : ''}`}
      title={isCollapsed ? label : ''}
    >
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0 ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      {!isCollapsed && <span className="text-sm font-semibold truncate">{label}</span>}
    </button>
  );
}

function ProjectDashboard({
  project, kanbanData, workloadData, sprintVelocityData,
  sprintStatusMixData, burndownSprint, sprintBurndownData,
  burndownEmptyText, activeSprint, sortedSprints,
  burndownSprintId, setBurndownSprintId, hasScrumContext,
  openTaskModal, pk
}) {
  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xs font-bold text-purple-600 uppercase tracking-[0.2em] mb-1">Project Dashboard</h2>
          <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
            {project?.description || "Manage your tasks, track sprint progress, and collaborate with your team in real-time."}
          </p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Dashboard Charts */}
        <div className="grid lg:grid-cols-3 lg:auto-rows-[340px] gap-8">
          {/* Task Distribution Chart */}
          {kanbanData.length > 0 && (
            <DashboardChartCard
              colSpan={1}
              title="Task Distribution"
              type={CHART_TYPES.DONUT}
              data={kanbanData}
              dataKey="value"
              nameKey="name"
              height={240}
              showLegend={true}
            />
          )}
          {/* Team Workload */}
          {workloadData.length > 0 && (
            <DashboardChartCard
              title="Team Workload"
              colSpan={2}
              type={CHART_TYPES.BAR}
              data={workloadData}
              nameKey="name"
              stacked={true}
              stackKeys={['active', 'completed']}
              stackColors={['#F59E0B', '#10B981']}
            />
          )}
        </div>

        {hasScrumContext && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Scrum Insights</h2>
              {activeSprint && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-indigo-100">
                  Active: {activeSprint.name}
                </span>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <DashboardChartCard
                title="Sprint Velocity"
                colSpan={2}
                type={CHART_TYPES.BAR}
                data={sprintVelocityData}
                nameKey="name"
                height={280}
                stacked={false}
                stackKeys={['committed', 'done']}
                stackColors={['#93C5FD', '#22C55E']}
                emptyText="No sprint points yet"
              />

              <DashboardChartCard
                title="Sprint Status Mix"
                type={CHART_TYPES.DONUT}
                data={sprintStatusMixData}
                dataKey="value"
                nameKey="name"
                height={240}
                showLegend={true}
                emptyText="No tasks in the active sprint"
              />
              <DashboardChartCard
                title={burndownSprint ? `Sprint Burndown: ${burndownSprint.name}` : 'Sprint Burndown'}
                type={CHART_TYPES.BURNDOWN}
                data={sprintBurndownData}
                colSpan={3}
                dataKey="actual"
                nameKey="name"
                height={320}
                lineKeys={['actual', 'ideal']}
                lineColors={['#EF4444', '#94A3B8']}
                showLegend={true}
                emptyText={burndownEmptyText}
                leftAction={
                  <button
                    onClick={() => {
                      const idx = sortedSprints.findIndex(s => s.id === burndownSprintId);
                      if (idx > 0) setBurndownSprintId(sortedSprints[idx - 1].id);
                    }}
                    disabled={sortedSprints.findIndex(s => s.id === burndownSprintId) <= 0}
                    className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                }
                rightAction={
                  <button
                    onClick={() => {
                      const idx = sortedSprints.findIndex(s => s.id === burndownSprintId);
                      if (idx !== -1 && idx < sortedSprints.length - 1) setBurndownSprintId(sortedSprints[idx + 1].id);
                    }}
                    disabled={sortedSprints.findIndex(s => s.id === burndownSprintId) >= sortedSprints.length - 1}
                    className="p-1 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                }
              />
            </div>
          </div>
        )}

        {/* Project Roadmap / Gantt */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Project Roadmap</h2>
          </div>

          <GanttChart
            tasks={project?.tasks || []}
            sprints={project?.sprints || []}
            statuses={project?.statuses || []}
            project_id={pk}
            onAddTask={openTaskModal}
            onEditTask={openTaskModal}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { pk } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [project, setProject] = useState(null);
  const [kanbanData, setKanbanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showProjectInfo, setShowProjectInfo] = useState(false);

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const fetchProject = useCallback(() => {
    setLoading(true);
    Promise.all([getProject(pk), getKanban(pk)])
      .then(([projRes, kanbanRes]) => {
        const rawData = projRes.data;
        let enrichedData = { ...rawData };

        // Enrich tasks with sprint_id from their stories immutably
        if (rawData.tasks && rawData.stories) {
          const storySprintMap = rawData.stories.reduce((acc, s) => {
            acc[s.id] = s.sprint_id;
            return acc;
          }, {});
          enrichedData.tasks = rawData.tasks.map(t => ({
            ...t,
            sprint_id: storySprintMap[t.story_id]
          }));
        }
        setProject(enrichedData);

        // Process kanban data for chart
        const kData = kanbanRes.data;
        const columns = Array.isArray(kData?.columns) ? kData.columns : kData;
        if (Array.isArray(columns)) {
          const buildKanbanChartData = (items) => items.map((col) => ({
            name: col.status.name,
            value: col.tasks.length,
            fill: col.status.color,
          }));
          setKanbanData(buildKanbanChartData(columns));
        }
      })
      .catch((err) => {
        console.error('Failed to load project data:', err);
        setError('Failed to load project data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pk]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleDelete = async () => {
    try {
      await deleteProject(pk);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete project');
      setDeleteConfirm(false);
    }
  };

  const [taskModalSprintId, setTaskModalSprintId] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const openTaskModal = (sprintId = '', taskId = null) => {
    setTaskModalSprintId(sprintId);
    setEditingTaskId(taskId);
    setShowTaskModal(true);
  };

  const workloadData = useMemo(() => {
    if (!project || !project.members) return [];

    const memberWorkload = project.members.map(member => {
      const activeTasks = project.tasks.filter(t =>
        t.status !== 'done' && t.assigned_to.some(a => a.id === member.id)
      ).length;
      const completedTasks = project.tasks.filter(t =>
        t.status === 'done' && t.assigned_to.some(a => a.id === member.id)
      ).length;

      return {
        name: `${member.first_name} ${member.last_name}`,
        active: activeTasks,
        completed: completedTasks,
      };
    });

    return memberWorkload;
  }, [project]);

  const activeSprint = useMemo(() => {
    const sprints = project?.sprints || [];
    if (sprints.length === 0) return null;
    const active = sprints.find((s) => s.status === 'active');
    if (active) return active;
    return [...sprints].sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];
  }, [project]);

  const sprintVelocityData = useMemo(() => {
    const sprints = project?.sprints || [];
    const stories = project?.stories || [];
    if (sprints.length === 0 || stories.length === 0) return [];

    const sortedSprints = [...sprints].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return sortedSprints
      .map((sprint) => {
        const sprintStories = stories.filter((s) => s.sprint_id === sprint.id);

        // Use frozen committed_points if available, fallback to current stories sum
        const committed = sprint.committed_points !== null && sprint.committed_points !== undefined
          ? sprint.committed_points
          : sprintStories.reduce((sum, s) => sum + Number(s.points || 0), 0);

        // Done points are the sum of points of stories currently in the sprint that are fully completed
        // (A story is completed if all its tasks are 'done' and it has at least one task)
        const done = sprintStories
          .filter((s) => {
            const storyTasks = (project?.tasks || []).filter(t => t.story_id === s.id);
            return storyTasks.length > 0 && storyTasks.every(t => t.status === 'done');
          })
          .reduce((sum, s) => sum + Number(s.points || 0), 0);

        return { name: sprint.name, committed, done };
      })
      .filter((d) => d.committed > 0 || d.done > 0);
  }, [project]);

  const sprintStatusMixData = useMemo(() => {
    if (!activeSprint) return [];
    const tasks = project?.tasks || [];
    const statuses = project?.statuses || [];

    const statusMap = statuses.reduce((acc, s) => {
      acc[s.slug] = { name: s.name || s.slug, color: s.color };
      return acc;
    }, {});

    const counts = {};
    tasks
      .filter((t) => t.sprint_id === activeSprint.id)
      .forEach((t) => {
        const key = t.status || 'unknown';
        counts[key] = (counts[key] || 0) + 1;
      });

    return Object.entries(counts).map(([status, count], index) => ({
      name: statusMap[status]?.name || status,
      value: count,
      fill: statusMap[status]?.color || CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [project, activeSprint]);

  const [burndownSprintId, setBurndownSprintId] = useState(null);

  const sortedSprints = useMemo(() => {
    return [...(project?.sprints || [])].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [project]);

  useEffect(() => {
    if (activeSprint && !burndownSprintId) {
      setBurndownSprintId(activeSprint.id);
    } else if (sortedSprints.length > 0 && !burndownSprintId) {
      setBurndownSprintId(sortedSprints[sortedSprints.length - 1].id);
    }
  }, [activeSprint, sortedSprints, burndownSprintId]);

  const burndownSprint = useMemo(() => {
    return sortedSprints.find(s => s.id === burndownSprintId) || activeSprint;
  }, [sortedSprints, burndownSprintId, activeSprint]);

  const sprintBurndownData = useMemo(() => {
    if (!burndownSprint) return [];
    const stories = project?.stories || [];
    const sprintStories = stories.filter((s) => s.sprint_id === burndownSprint.id);

    // Starting value: frozen committed_points or sum of points of stories currently in sprint
    const totalValue = burndownSprint.committed_points !== null && burndownSprint.committed_points !== undefined
      ? burndownSprint.committed_points
      : sprintStories.reduce((sum, s) => sum + Number(s.points || 0), 0);

    if (totalValue <= 0) return [];

    const start = new Date(burndownSprint.start_date);
    const end = new Date(burndownSprint.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
    const isSprintComplete = end < today;

    // Pre-calculate story completion dates
    const storiesWithCompletion = sprintStories.map(s => {
      const storyTasks = (project?.tasks || []).filter(t => t.story_id === s.id);
      const isDone = storyTasks.length > 0 && storyTasks.every(t => t.status === 'done');
      let doneDate = null;
      if (isDone) {
        const completionDates = storyTasks
          .map(t => t.completed_at ? new Date(t.completed_at) : (t.updated_at ? new Date(t.updated_at) : null))
          .filter(d => d !== null);
        if (completionDates.length > 0) {
          doneDate = new Date(Math.max(...completionDates));
        }
      }
      return { ...s, isDone, doneDate };
    });

    const data = [];
    for (let i = 0; i < totalDays; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const completedSoFar = storiesWithCompletion.reduce((sum, s) => {
        if (s.isDone && s.doneDate && s.doneDate <= dayEnd) {
          return sum + Number(s.points || 0);
        }
        return sum;
      }, 0);

      const remaining = Math.max(totalValue - completedSoFar, 0);
      const ratio = totalDays > 1 ? i / (totalDays - 1) : 1;
      const ideal = Math.max(totalValue - totalValue * ratio, 0);

      const dayOnly = new Date(day);
      dayOnly.setHours(0, 0, 0, 0);
      const isPastOrToday = dayOnly <= today;
      const isToday = dayOnly.getTime() === today.getTime();

      // Range for shading: [Math.min(actual, ideal), Math.max(actual, ideal)]
      // But we need to distinguish between Good (actual < ideal) and Bad (actual > ideal)
      const isAhead = remaining < ideal;

      data.push({
        name: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        actual: isPastOrToday ? remaining : null, // Line stops at today
        ideal: Math.round(ideal * 100) / 100,
        shadedActual: !isSprintComplete && (!isPastOrToday || isToday) ? totalValue : null, // Shade future days (window) in gray
        goodArea: isPastOrToday && isAhead ? [remaining, ideal] : [ideal, ideal],
        badArea: isPastOrToday && !isAhead ? [ideal, remaining] : [ideal, ideal],
        isToday: isToday,
      });
    }

    return data;
  }, [project, burndownSprint]);

  const burndownEmptyText = useMemo(() => {
    if (!activeSprint) return "No active sprint";
    return "No tasks in the active sprint to burn down";
  }, [activeSprint]);

  const hasScrumContext = (project?.sprints?.length || 0) > 0 || (project?.tasks?.length || 0) > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      </div>
    );
  }

  const renderTabContent = () => {
    const commonProps = { project, pk, isTab: true, onRefresh: fetchProject };

    switch (activeTab) {
      case 'kanban':
        return <KanbanBoard {...commonProps} />;
      case 'scrum':
        return <ScrumBoard {...commonProps} />;
      case 'members':
        return <Members {...commonProps} />;
      case 'leaderboard':
        return <Leaderboard {...commonProps} />;
      case 'chat':
        return <ProjectChat {...commonProps} />;
      case 'dashboard':
      default:
        return (
          <ProjectDashboard
            project={project}
            kanbanData={kanbanData}
            workloadData={workloadData}
            sprintVelocityData={sprintVelocityData}
            sprintStatusMixData={sprintStatusMixData}
            burndownSprint={burndownSprint}
            sprintBurndownData={sprintBurndownData}
            burndownEmptyText={burndownEmptyText}
            activeSprint={activeSprint}
            sortedSprints={sortedSprints}
            burndownSprintId={burndownSprintId}
            setBurndownSprintId={setBurndownSprintId}
            hasScrumContext={hasScrumContext}
            openTaskModal={openTaskModal}
            pk={pk}
          />
        );
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-white/50">
      {/* Structural Left Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} border-r border-gray-300 bg-white shadow sticky top-16 h-[calc(100vh-64px)] overflow-hidden flex flex-col flex-shrink-0 z-10 transition-all duration-300 group/sidebar relative`}>
        <div className={`p-6 border-b border-gray-100/50 ${isSidebarCollapsed ? 'px-4' : ''}`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-2`}>
            {!isSidebarCollapsed && (
              <h1 className="text-l font-extrabold text-gray-900 tracking-tight leading-tight truncate" title={project?.name}>
                {project?.name}
              </h1>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="group p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-expanded={!isSidebarCollapsed}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-3 h-3 transition-transform flex-shrink-0 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 overflow-hidden h-1.5 rounded-full bg-gray-100">
                <div style={{ width: `${project?.progress}%` }} className="h-full bg-purple-500 rounded-full transition-all duration-500"></div>
              </div>
              <span className="text-xs font-bold text-purple-600">{project?.progress}%</span>
            </div>
          )}
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setShowProjectInfo(!showProjectInfo)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span>{showProjectInfo ? 'Hide details' : 'Show details'}</span>
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform ${showProjectInfo ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {!isSidebarCollapsed && showProjectInfo && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Manager</label>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-600 uppercase">
                    {project?.manager?.first_name?.[0]}{project?.manager?.last_name?.[0]}
                  </div>
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {project?.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Unassigned'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Deadline</label>
                <div className="flex items-center gap-2 text-red-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-tight">
                    {project?.deadline ? new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden  p-4 space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          {!isSidebarCollapsed && <h2 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Navigation</h2>}
          <QuickCard
            id="dashboard"
            label="Project Dashboard"
            color="bg-gray-100"
            active={activeTab === 'dashboard'}
            onClick={setTab}
            isCollapsed={isSidebarCollapsed}
            activeClasses="bg-gray-100 text-gray-600 shadow-sm ring-1 ring-gray-200"
            icon={<svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          />
          <div className="h-2" />
          <QuickCard
            id="kanban"
            label="Kanban Board"
            color="bg-purple-50"
            active={activeTab === 'kanban'}
            onClick={setTab}
            isCollapsed={isSidebarCollapsed}
            activeClasses="bg-purple-50 text-purple-600 shadow-sm ring-1 ring-purple-100"
            icon={<svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>}
          />
          <QuickCard
            id="scrum"
            label="Scrum Board"
            color="bg-indigo-50"
            active={activeTab === 'scrum'}
            onClick={setTab}
            isCollapsed={isSidebarCollapsed}
            activeClasses="bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100"
            icon={<svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          />
          <QuickCard
            id="members"
            label="Team Members"
            color="bg-green-50"
            active={activeTab === 'members'}
            onClick={setTab}
            isCollapsed={isSidebarCollapsed}
            activeClasses="bg-green-50 text-green-600 shadow-sm ring-1 ring-green-100"
            icon={<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          />
          <QuickCard
            id="leaderboard"
            label="Leaderboard"
            color="bg-yellow-50"
            active={activeTab === 'leaderboard'}
            onClick={setTab}
            isCollapsed={isSidebarCollapsed}
            activeClasses="bg-yellow-50 text-yellow-600 shadow-sm ring-1 ring-yellow-100"
            icon={<svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16M6 20v-9a1 1 0 011-1h2a1 1 0 011 1v9M10 20V8a1 1 0 011-1h2a1 1 0 011 1v12M14 20v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>}
          />
          <QuickCard
            id="chat"
            label="Team Chat"
            color="bg-purple-50"
            active={activeTab === 'chat'}
            onClick={setTab}
            isCollapsed={isSidebarCollapsed}
            activeClasses="bg-purple-50 text-purple-600 shadow-sm ring-1 ring-purple-100"
            icon={<svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          />
        </nav>

        {canManageProjects(user) && (
          <div className={`mt-auto p-2 bg-gray-100 border-t border-gray-100 ${isSidebarCollapsed ? 'px-4 flex flex-col items-center' : ''}`}>
            <div className={`w-full ${isSidebarCollapsed ? 'flex flex-col items-center gap-2' : 'flex flex-wrap items-center gap-2'}`}>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                title="Edit Project"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              {deleteConfirm ? (
                <div className={`flex items-center gap-2 bg-red-50 p-1 rounded-xl border border-red-100 ${isSidebarCollapsed ? 'w-full justify-center' : ''}`}>
                  <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Confirm</button>
                  <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 text-gray-600 text-xs font-bold">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete Project"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {renderTabContent()}

        <TaskEdit
          isOpen={showTaskModal}
          onClose={() => { setShowTaskModal(false); setEditingTaskId(null); }}
          pk={pk}
          taskId={editingTaskId}
          initialStoryId={taskModalSprintId}
          onSuccess={fetchProject}
        />
        <ProjectEditModal
          isOpen={showEditModal}
          pk={pk}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchProject}
        />
        <ProjectSettingsModal
          isOpen={showSettingsModal}
          pk={pk}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={fetchProject}
        />
      </main>
    </div>
  );
}
