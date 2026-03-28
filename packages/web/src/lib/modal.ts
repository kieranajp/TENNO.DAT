/**
 * Shared modal behaviour helpers.
 * Used by ItemModal, SettingsDialog, SystemInfoDialog.
 */

export function handleKeydown(event: KeyboardEvent, onClose: () => void) {
	if (event.key === 'Escape') {
		onClose();
	}
}

export function handleOverlayClick(event: MouseEvent, onClose: () => void) {
	if (event.target === event.currentTarget) {
		onClose();
	}
}
