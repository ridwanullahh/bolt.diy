import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { useChatHistory } from '~/lib/persistence';
import { DeployButton } from '~/components/deploy/DeployButton';
import { ProjectManagerComponent, useProjectManager } from '~/components/project-management/ProjectManager';
import { IconButton } from '~/components/ui';

interface HeaderActionButtonsProps {
  chatStarted: boolean;
}

export function HeaderActionButtons({ chatStarted }: HeaderActionButtonsProps) {
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const isStreaming = useStore(streamingState);
  const { exportChat } = useChatHistory();
  const { isOpen, openProjectManager, closeProjectManager } = useProjectManager();

  const shouldShowButtons = !isStreaming && activePreview;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Project Manager Button */}
        {chatStarted && (
          <IconButton
            onClick={openProjectManager}
            title="Project Manager"
            className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
          >
            <div className="i-ph:kanban text-lg" />
          </IconButton>
        )}

        {chatStarted && shouldShowButtons && <ExportChatButton exportChat={exportChat} />}
        {shouldShowButtons && <DeployButton />}
      </div>

      {/* Project Manager Dialog */}
      <ProjectManagerComponent
        isOpen={isOpen}
        onClose={closeProjectManager}
        onTaskCreate={(task) => {
          console.log('Task created:', task);
          // Could integrate with chat here to announce task creation
        }}
      />
    </>
  );
}
