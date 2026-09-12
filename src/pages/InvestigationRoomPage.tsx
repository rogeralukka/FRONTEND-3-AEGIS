import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  MOCK_INVESTIGATION_CASE,
  GraphNodeData,
  CaseInvestigationData,
  MockEvidencePickerItem,
  AiLogEntry,
} from '../data/mockInvestigationData';
import {
  DISCOVERY_STAGES,
  SuggestionChipItem,
} from '../data/investigationDiscoverySequence';
import {
  loadCaseDiscoveryStage,
  saveCaseDiscoveryStage,
} from '../services/discoveryService';
import { CaseContextStrip } from '../components/investigation/CaseContextStrip';
import { EvidenceGraph } from '../components/investigation/EvidenceGraph';
import { EntityInspector } from '../components/investigation/EntityInspector';
import { AegisAiPanel } from '../components/investigation/AegisAiPanel';
import { CaseItem } from './CasesPage';
import { loadStoredCases, updateCaseStatus } from '../services/caseService';

interface InvestigationRoomPageProps {
  caseId?: string;
  cases?: CaseItem[];
  onNavigateBack?: () => void;
  onUpdateCaseStatus?: (caseId: string, status: 'INVESTIGATION ACTIVE' | 'INVESTIGATION COMPLETE') => void;
}

export const InvestigationRoomPage: React.FC<InvestigationRoomPageProps> = ({
  caseId,
  cases: propCases,
  onNavigateBack,
  onUpdateCaseStatus,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const activeCases = propCases ?? loadStoredCases();
  const resolvedCase = caseId ? activeCases.find((c) => c.id === caseId) : undefined;

  // Handle gracefully when navigating to /cases/:id with no case data
  if (!resolvedCase) {
    return (
      <div
        className={`relative w-full h-[100dvh] overflow-hidden flex flex-col items-center justify-center px-6 transition-colors duration-300 ${
          isDark ? 'bg-[#080A0C] text-[#EDEAE3]' : 'bg-[#F6F4EE] text-[#1A1C1E]'
        }`}
      >
        <div className="w-full max-w-md text-center">
          <span
            className={`font-mono text-xs uppercase tracking-[0.22em] block mb-3 select-none ${
              isDark ? 'text-[#74AC95]' : 'text-[#1E6147]'
            }`}
          >
            404 · CASE FILE NOT FOUND
          </span>
          <h2
            className={`font-sans text-xl sm:text-2xl font-bold tracking-tight mb-3 ${
              isDark ? 'text-[#EDEAE3]' : 'text-[#1A1C1E]'
            }`}
          >
            {caseId ? `No investigation record for ${caseId}.` : 'No investigation specified.'}
          </h2>
          <p
            className={`font-sans text-xs sm:text-sm leading-relaxed mb-8 ${
              isDark ? 'text-[#EDEAE3]/55' : 'text-[#1A1C1E]/55'
            }`}
          >
            This case file has not been initiated in the Ashwick environment yet. Start a new investigation to generate case evidence.
          </p>
          <button
            onClick={onNavigateBack}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border font-mono text-xs uppercase tracking-widest transition-all duration-200 cursor-pointer ${
              isDark
                ? 'border-white/[0.12] bg-[#0D1117] text-[#EDEAE3] hover:border-[#74AC95]/50 hover:text-[#74AC95] hover:bg-[#11161E]'
                : 'border-black/[0.12] bg-white text-[#1A1C1E] hover:border-[#1E6147]/50 hover:text-[#1E6147] hover:bg-[#FAF8F5] shadow-[0_1px_4px_rgba(0,0,0,0.02)]'
            }`}
          >
            <span>←</span>
            <span>Return to Case Files</span>
          </button>
        </div>
      </div>
    );
  }

  // If case is already complete, open directly in resolution state (Section 2)
  const isInitiallyComplete = resolvedCase.status === 'INVESTIGATION COMPLETE';
  const initialStage = loadCaseDiscoveryStage(resolvedCase.id, isInitiallyComplete);
  const [discoveryStage, setDiscoveryStage] = useState<number>(initialStage);
  const discoveryStageRef = useRef<number>(initialStage);
  const prevCaseIdRef = useRef<string | undefined>(resolvedCase?.id);

  const getAccumulatedLogs = (stageIdx: number): AiLogEntry[] => {
    const logs: AiLogEntry[] = [];
    for (let i = 0; i <= stageIdx; i++) {
      if (DISCOVERY_STAGES[i]) {
        logs.push(...DISCOVERY_STAGES[i].newLogs);
      }
    }
    return logs;
  };

  const initialStageData = DISCOVERY_STAGES[initialStage] || DISCOVERY_STAGES[0];

  // Case investigation state
  const [caseData, setCaseData] = useState<CaseInvestigationData>(() => ({
    ...MOCK_INVESTIGATION_CASE,
    caseId: resolvedCase.id,
    title: resolvedCase.title,
    objective: initialStageData.objective,
    latestFinding: initialStageData.latestFinding,
    nextLead: initialStageData.nextLead,
    confidence: initialStageData.confidence,
    evidenceCount: initialStageData.evidenceCount,
    nodes: initialStageData.nodes,
    edges: initialStageData.edges,
    logs: getAccumulatedLogs(initialStage),
  }));

  const [currentSuggestions, setCurrentSuggestions] = useState<SuggestionChipItem[]>(
    initialStageData.suggestions
  );
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [isAiCollapsed, setIsAiCollapsed] = useState<boolean>(false);

  // Track status from resolvedCase, defaulting to 'INVESTIGATION ACTIVE'
  const [caseStatus, setCaseStatus] = useState<'INVESTIGATION ACTIVE' | 'INVESTIGATION COMPLETE'>(
    resolvedCase.status || 'INVESTIGATION ACTIVE'
  );

  const [isSolved, setIsSolved] = useState<boolean>(Boolean(isInitiallyComplete));

  // Sync state ONLY if navigating to a DIFFERENT case ID
  useEffect(() => {
    if (resolvedCase && resolvedCase.id !== prevCaseIdRef.current) {
      prevCaseIdRef.current = resolvedCase.id;
      setCaseStatus(resolvedCase.status);
      const isComplete = resolvedCase.status === 'INVESTIGATION COMPLETE';
      setIsSolved(isComplete);
      const stage = loadCaseDiscoveryStage(resolvedCase.id, isComplete);
      discoveryStageRef.current = stage;
      setDiscoveryStage(stage);
      const sData = DISCOVERY_STAGES[stage] || DISCOVERY_STAGES[0];
      setCaseData({
        ...MOCK_INVESTIGATION_CASE,
        caseId: resolvedCase.id,
        title: resolvedCase.title,
        objective: sData.objective,
        latestFinding: sData.latestFinding,
        nextLead: sData.nextLead,
        confidence: sData.confidence,
        evidenceCount: sData.evidenceCount,
        nodes: sData.nodes,
        edges: sData.edges,
        logs: getAccumulatedLogs(stage),
      });
      setCurrentSuggestions(sData.suggestions);
    }
  }, [resolvedCase?.id]);

  // Handle solve case toggle
  const handleSolveToggle = () => {
    setIsSolved((prev) => {
      const next = !prev;
      // If opening resolution, automatically expand AI panel to present conclusion
      if (next) {
        setIsAiCollapsed(false);
      }
      return next;
    });
  };

  // Handle return to active investigation (working state)
  const handleReturnToActive = () => {
    setIsSolved(false);
  };

  // Handle close case (Section 2)
  const handleCloseCase = () => {
    const nextStatus = 'INVESTIGATION COMPLETE';
    setCaseStatus(nextStatus);
    setIsSolved(true);
    // Mark as solved/complete in discovery storage
    saveCaseDiscoveryStage(resolvedCase.id, 4);
    updateCaseStatus(resolvedCase.id, nextStatus);
    onUpdateCaseStatus?.(resolvedCase.id, nextStatus);
    onNavigateBack?.();
  };

  // Handle reopen investigation (Section 3)
  const handleReopenCase = () => {
    const nextStatus = 'INVESTIGATION ACTIVE';
    setCaseStatus(nextStatus);
    setIsSolved(false);
    updateCaseStatus(resolvedCase.id, nextStatus);
    onUpdateCaseStatus?.(resolvedCase.id, nextStatus);
  };

  // Handle adding mock evidence item
  const handleAddEvidence = (item: MockEvidencePickerItem) => {
    setCaseData((prev) => {
      if (prev.nodes.some((n) => n.id === item.node.id)) {
        return prev;
      }
      return {
        ...prev,
        evidenceCount: prev.evidenceCount + 1,
        nodes: [...prev.nodes, item.node],
        edges: [...prev.edges, item.edge],
      };
    });
  };

  // Handle clicking suggestion chip
  const handleSelectSuggestion = (item: SuggestionChipItem) => {
    // 1. Softened final suggestion in Stage 4: "Review findings and prepare briefing"
    if (item.id === 's4_solve') {
      handleSolveToggle();
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Add USER DISPATCH immediately
    const userLog: AiLogEntry = {
      timestamp: timeStr,
      label: 'USER DISPATCH',
      text: item.label,
    };

    if (item.isLeadAction) {
      const currentStage = discoveryStageRef.current;
      const nextStageIndex = Math.min(currentStage + 1, 4);
      const nextStageData = DISCOVERY_STAGES[nextStageIndex];

      discoveryStageRef.current = nextStageIndex;
      setDiscoveryStage(nextStageIndex);
      saveCaseDiscoveryStage(resolvedCase.id, nextStageIndex);

      setCaseData((prev) => ({
        ...prev,
        logs: [...prev.logs, userLog],
      }));

      // Reveal discovery batch after 250ms
      setTimeout(() => {
        setCaseData((prev) => ({
          ...prev,
          objective: nextStageData.objective,
          latestFinding: nextStageData.latestFinding,
          nextLead: nextStageData.nextLead,
          confidence: nextStageData.confidence,
          evidenceCount: nextStageData.evidenceCount,
          nodes: nextStageData.nodes,
          edges: nextStageData.edges,
          logs: [...prev.logs, ...nextStageData.newLogs],
        }));

        setCurrentSuggestions(nextStageData.suggestions);
      }, 250);
    } else {
      // Non-advancing inquiry: returns informative response without dead ends
      setCaseData((prev) => ({
        ...prev,
        logs: [...prev.logs, userLog],
      }));

      setTimeout(() => {
        const infoLog: AiLogEntry = {
          timestamp: timeStr,
          label: item.infoResponse?.label || 'QUERY RESPONSE',
          text: item.infoResponse?.text || 'No additional records returned.',
        };
        setCaseData((prev) => ({
          ...prev,
          logs: [...prev.logs, infoLog],
        }));
      }, 250);
    }
  };

  // Handle composer submission
  const handleSubmitDispatch = (text: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const userLog: AiLogEntry = {
      timestamp: timeStr,
      label: 'USER DISPATCH',
      text,
    };

    setCaseData((prev) => ({
      ...prev,
      logs: [...prev.logs, userLog],
    }));

    const currentStage = discoveryStageRef.current;
    if (currentStage < 4) {
      const nextStageIndex = currentStage + 1;
      const nextStageData = DISCOVERY_STAGES[nextStageIndex];

      discoveryStageRef.current = nextStageIndex;
      setDiscoveryStage(nextStageIndex);
      saveCaseDiscoveryStage(resolvedCase.id, nextStageIndex);

      setTimeout(() => {
        setCaseData((prev) => ({
          ...prev,
          objective: nextStageData.objective,
          latestFinding: nextStageData.latestFinding,
          nextLead: nextStageData.nextLead,
          confidence: nextStageData.confidence,
          evidenceCount: nextStageData.evidenceCount,
          nodes: nextStageData.nodes,
          edges: nextStageData.edges,
          logs: [...prev.logs, ...nextStageData.newLogs],
        }));

        setCurrentSuggestions(nextStageData.suggestions);
      }, 250);
    } else {
      setTimeout(() => {
        const infoLog: AiLogEntry = {
          timestamp: timeStr,
          label: 'ANALYTICS',
          text: `Correlated inquiry "${text}" evaluated. All primary evidence vectors reconciled.`,
        };
        setCaseData((prev) => ({
          ...prev,
          logs: [...prev.logs, infoLog],
        }));
      }, 250);
    }
  };

  return (
    <div
      data-discovery-stage={discoveryStage}
      className={`relative w-full h-[100dvh] overflow-hidden flex flex-col pt-16 transition-colors duration-300 ${
        isDark ? 'bg-[#080A0C] text-[#EDEAE3]' : 'bg-[#F6F4EE] text-[#1A1C1E]'
      }`}
    >
      {/* 1. TOP CASE CONTEXT STRIP (Compact ~56px) */}
      <CaseContextStrip
        caseId={resolvedCase.id}
        title={resolvedCase.title}
        status={caseStatus}
        isSolved={isSolved}
        evidenceCount={caseData.evidenceCount}
        confidence={caseData.confidence}
        onSolveToggle={handleSolveToggle}
        onCloseCase={handleCloseCase}
        onReturnToActive={handleReturnToActive}
        onReopenCase={handleReopenCase}
        onNavigateBack={onNavigateBack}
      />

      {/* 2. BODY SPLIT CANVAS AREA */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        
        {/* Evidence Graph Canvas (Left / Center - dominates workspace) */}
        <div className="absolute inset-0">
          <EvidenceGraph
            nodes={caseData.nodes}
            edges={caseData.edges}
            selectedNodeId={selectedNode ? selectedNode.id : null}
            isSolved={isSolved}
            isCaseComplete={isInitiallyComplete || caseStatus === 'INVESTIGATION COMPLETE'}
            onSelectNode={(node) => setSelectedNode(node)}
          />
        </div>

        {/* Entity Inspector (Slides in / floats on left when a node is selected) */}
        {selectedNode && (
          <EntityInspector
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {/* Floating AEGIS AI Frosted Glass Panel (Floats on right with ~24px margins) */}
        <AegisAiPanel
          caseData={caseData}
          suggestions={currentSuggestions}
          isCollapsed={isAiCollapsed}
          isSolved={isSolved}
          onToggleCollapse={() => setIsAiCollapsed((prev) => !prev)}
          onAddEvidence={handleAddEvidence}
          onSelectSuggestion={handleSelectSuggestion}
          onSubmitDispatch={handleSubmitDispatch}
        />

      </div>
    </div>
  );
};
