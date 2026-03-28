import { getContext, setContext } from 'svelte'

export interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
}

const KEY = 'window-controls'

export function setWindowControls(controls: WindowControls) {
  setContext(KEY, controls)
}

export function getWindowControls(): WindowControls {
  return getContext<WindowControls>(KEY)
}
