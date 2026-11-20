function setupMenuBook(links) {
  if (!links.length || typeof HTMLDialogElement === "undefined") return;

  const pageCount = 8;
  const book = document.createElement("dialog");
  book.className = "menu-book";
  book.setAttribute("aria-label", "Food and drinks menu");
  book.innerHTML = `
    <button class="menu-book-control menu-book-close popup-close" type="button" aria-label="Close menu" autofocus>×</button>
    <div class="menu-book-sheet"><img alt="" hidden><img alt="" hidden></div>
    <div class="menu-book-footer">
      <button class="menu-book-control" type="button" aria-label="Previous page">←</button>
      <p class="menu-book-status" role="status"></p>
      <button class="menu-book-control" type="button" aria-label="Next page">→</button>
    </div>`;
  if (typeof book.showModal !== "function") return;

  document.body.append(book);
  const [close, previous, next] = book.querySelectorAll("button");
  const status = book.querySelector(".menu-book-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let [currentSheet, nextSheet] = book.querySelectorAll("img");
  let currentPage = 0;
  let opener;
  let pending = false;
  let version = 0;
  let turn;

  function setNavigation() {
    previous.setAttribute("aria-disabled", String(pending || currentPage <= 1));
    next.setAttribute("aria-disabled", String(pending || currentPage >= pageCount));
  }

  async function showPage(page) {
    if (pending || page < 1 || page > pageCount) return;
    const request = ++version;
    const incoming = nextSheet;
    const outgoing = currentSheet;
    pending = true;
    setNavigation();
    status.textContent = `Loading page ${page}…`;
    incoming.src = new URL(`page-${page}.webp`, opener.href).href;
    try {
      await incoming.decode();
      if (request !== version || !book.open) return;
      incoming.alt = `Menu page ${page} of ${pageCount}`;
      incoming.hidden = false;
      if (currentPage && !reducedMotion.matches && typeof incoming.animate === "function") {
        const forward = page > currentPage;
        const leaf = forward ? outgoing : incoming;
        leaf.style.zIndex = "1";
        const flat = { transform: "rotateY(0deg)", filter: "brightness(1)" };
        const folded = { transform: "rotateY(-90deg)", filter: "brightness(.65)" };
        turn = leaf.animate(forward ? [flat, folded] : [folded, flat], {
          duration: 420,
          easing: "ease-in-out",
          fill: "both",
        });
        await turn.finished;
        if (request !== version || !book.open) return;
        outgoing.hidden = true;
        turn.cancel();
        turn = undefined;
        leaf.style.removeProperty("z-index");
      }
      outgoing.hidden = true;
      [currentSheet, nextSheet] = [incoming, outgoing];
      currentPage = page;
      status.textContent = `Page ${page} of ${pageCount}`;
    } catch {
      if (request !== version || !book.open) return;
      incoming.hidden = true;
      status.textContent = "Page unavailable. Try again.";
    } finally {
      if (request === version) {
        pending = false;
        setNavigation();
      }
    }
  }

  links.forEach(link => {
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      opener = link;
      book.showModal();
      showPage(1);
    });
  });
  previous.addEventListener("click", () => showPage(currentPage - 1));
  next.addEventListener("click", () => showPage(currentPage + 1));
  close.addEventListener("click", () => book.close());
  book.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showPage(currentPage + (event.key === "ArrowRight" ? 1 : -1));
  });
  book.addEventListener("close", () => {
    version++;
    turn?.cancel();
    turn = undefined;
    currentPage = 0;
    pending = false;
    [currentSheet, nextSheet].forEach(sheet => {
      sheet.hidden = true;
      sheet.style.removeProperty("z-index");
    });
    opener?.focus({ preventScroll: true });
  });
}

setupMenuBook([...document.querySelectorAll("[data-menu-book]")]);
