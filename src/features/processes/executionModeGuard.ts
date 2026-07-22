type ExecutionMode = 'thread' | 'process'

export const startExecutionModeWhenAllowed = (
  allowed: boolean,
  executionMode: ExecutionMode,
  onStart: (options: { executionMode: ExecutionMode }) => void,
  onClose: () => void
): void => {
  if (!allowed) return

  onStart({ executionMode })
  onClose()
}
