function copyWithSelection(text) {
  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const previousSelection = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  const textArea = document.createElement("textarea");

  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.setAttribute("aria-hidden", "true");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "100%";
  textArea.style.height = "1px";
  textArea.style.fontSize = "16px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);

  try {
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    if (!document.execCommand("copy")) {
      throw new Error("The browser declined the clipboard copy.");
    }
  } finally {
    textArea.remove();
    if (activeElement instanceof HTMLElement) activeElement.focus();
    if (previousSelection && selection) {
      selection.removeAllRanges();
      selection.addRange(previousSelection);
    }
  }
}

export async function copyTextToClipboard(value) {
  const text = String(value);
  if (!text) throw new Error("There is no text to copy.");

  try {
    copyWithSelection(text);
    return;
  } catch (legacyError) {
    if (!navigator.clipboard?.writeText) throw legacyError;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  }
}
