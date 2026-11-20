document.querySelectorAll("[data-shelf]").forEach((shelf) => {
  const scroller = shelf.querySelector("[data-shelf-scroll]");
  const rows = Array.from(shelf.querySelectorAll(".shelf-row"));
  const previous = shelf.querySelector('[data-shelf-step="-1"]');
  const next = shelf.querySelector('[data-shelf-step="1"]');
  const progress = shelf.querySelector(".shelf-progress");
  const thumb = progress.firstElementChild;
  const tolerance = 2;
  let dragOffset = 0;

  const getEnd = () => scroller.scrollHeight - scroller.clientHeight;

  function syncControls() {
    previous.setAttribute("aria-disabled", scroller.scrollTop <= tolerance);
    next.setAttribute("aria-disabled", scroller.scrollTop >= getEnd() - tolerance);
    const scrollHeight = scroller.scrollHeight;
    if (scrollHeight === 0) return;
    progress.style.setProperty("--shelf-thumb-top", `${100 * scroller.scrollTop / scrollHeight}%`);
    progress.style.setProperty("--shelf-thumb-height", `${100 * scroller.clientHeight / scrollHeight}%`);
  }

  function step(direction) {
    const scrollTop = scroller.scrollTop;
    const firstRowTop = rows[0].offsetTop;
    const rowPositions = rows.map((row) => row.offsetTop - firstRowTop);
    const position = direction > 0
      ? rowPositions.find((top) => top > scrollTop + tolerance) ?? getEnd()
      : rowPositions.findLast((top) => top < scrollTop - tolerance) ?? 0;

    scroller.scrollTo({ top: position });
  }

  [[previous, -1], [next, 1]].forEach(([button, direction]) => {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-disabled") === "false") step(direction);
    });
  });

  scroller.addEventListener("keydown", (event) => {
    if (event.target !== scroller || event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        break;
      case "ArrowDown":
        event.preventDefault();
        step(1);
        break;
      case "Home":
        event.preventDefault();
        scroller.scrollTo({ top: 0 });
        break;
      case "End":
        event.preventDefault();
        scroller.scrollTo({ top: getEnd() });
        break;
    }
  });

  scroller.addEventListener("click", (event) => {
    const box = event.target.closest(".game-box");
    if (!box) return;

    const selected = scroller.querySelector('.game-box[aria-pressed="true"]');
    selected?.setAttribute("aria-pressed", "false");
    if (selected !== box) box.setAttribute("aria-pressed", "true");
  });

  function moveThumb(clientY) {
    const track = progress.getBoundingClientRect();
    const available = track.height - thumb.offsetHeight;
    if (available <= 0) return;
    scroller.scrollTop = getEnd() * (clientY - track.top - dragOffset) / available;
  }

  progress.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    const handle = thumb.getBoundingClientRect();
    dragOffset = event.clientY >= handle.top && event.clientY <= handle.bottom
      ? event.clientY - handle.top
      : handle.height / 2;
    progress.setPointerCapture(event.pointerId);
    scroller.classList.add("is-dragging");
    moveThumb(event.clientY);
  });

  progress.addEventListener("pointermove", (event) => {
    if (progress.hasPointerCapture(event.pointerId)) moveThumb(event.clientY);
  });

  progress.addEventListener("lostpointercapture", () => scroller.classList.remove("is-dragging"));

  scroller.addEventListener("scroll", syncControls, { passive: true });
  new ResizeObserver(syncControls).observe(scroller);
  syncControls();
});
