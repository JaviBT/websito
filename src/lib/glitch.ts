const CHARS = '!@#$%^*-+=[]{}|;:,.<>?/\\ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

/**
 * Gradually resolves `el.textContent` to `target`, one character left-to-right
 * per `msPerChar` ms. Unresolved characters display as random glitch chars.
 * Returns a cancel function.
 */
function resolveText(
  el: HTMLElement,
  target: string,
  msPerChar: number,
  onDone?: () => void,
): () => void {
  let resolved = 0;
  const id = window.setInterval(() => {
    resolved++;
    el.textContent = target
      .split('')
      .map((c, i) => (i < resolved ? c : c === ' ' ? ' ' : randChar()))
      .join('');
    if (resolved >= target.length) {
      clearInterval(id);
      el.textContent = target;
      onDone?.();
    }
  }, msPerChar);
  return () => clearInterval(id);
}

/**
 * Attaches a hover-scramble effect to the brand anchor: on mouseenter the text
 * instantly randomises then resolves back to the original left-to-right.
 */
export function initBrandGlitch(el: HTMLAnchorElement): void {
  const original = el.textContent!.trim();
  let cancel: () => void = () => {};

  el.addEventListener('mouseenter', () => {
    cancel();
    el.textContent = original.split('').map(() => randChar()).join('');
    cancel = resolveText(el, original, 38);
  });
}

/**
 * Wires up all `[data-glitch-btn]` elements: on click the text scrambles to
 * `data-target`, holds for 1.2 s, then resolves back to `data-original`.
 */
export function initNavGlitch(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-glitch-btn]').forEach(btn => {
    const original = btn.dataset.original!;
    const target   = btn.dataset.target!;
    let busy = false;

    btn.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      btn.style.color = 'var(--color-accent)';
      btn.textContent  = original.split('').map(() => randChar()).join('');

      resolveText(btn, target, 70, () => {
        setTimeout(() => {
          btn.style.color = '';
          btn.textContent  = target.split('').map(() => randChar()).join('');
          resolveText(btn, original, 70, () => { busy = false; });
        }, 1200);
      });
    });
  });
}
