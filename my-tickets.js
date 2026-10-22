
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const list = $("ticketList");
  const modal = $("ticketModal");
  const modalEvent = $("modalEvent");
  const modalTicket = $("modalTicket");
  const modalOrder = $("modalOrder");
  const ticketQR = $("ticketQR");
  const closeModal = $("closeModal");

  if (!list) return;

  const auth = window.TT_AUTH;
  const ticketCore = window.TT_TICKETS;

  const normalize = value => String(value ?? "");

  const money = value =>
    new Intl.NumberFormat("vi-VN").format(
      Number(value) || 0
    ) + " đ";

  function readArray(key) {
    try {
      const data = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function getUser() {
    const user = auth?.getCurrentUser?.();

    if (
      !user ||
      !user.verified ||
      !user.verifiedIdentityId
    ) {
      return null;
    }

    return user;
  }

  function getEvents() {
    const map = new Map();

    (window.TT_SEED_EVENTS || []).forEach(event => {
      if (event?.id != null) {
        map.set(normalize(event.id), event);
      }
    });

    readArray("tt_events").forEach(event => {
      if (event?.id != null) {
        map.set(normalize(event.id), event);
      }
    });

    return [...map.values()];
  }

  function findEvent(eventId) {
    return getEvents().find(
      event => normalize(event.id) === normalize(eventId)
    ) || null;
  }

  function getOrders() {
    return readArray("tt_orders");
  }

  // Đồng bộ những đơn mua vé gốc từ trước.
  // Không tạo vé mới từ đơn mua lại.
  function syncOldOrders() {
    if (!ticketCore?.createFromOrder) return;

    const listings = readArray("tt_resales");

    getOrders().forEach(order => {
      if (order.status !== "paid") return;
      if (order.type === "resale") return;

      if (
        !order.id ||
        !order.buyer?.userId ||
        !order.buyer?.verifiedIdentityId ||
        !Array.isArray(order.items)
      ) {
        return;
      }

      const hasLegacySold = listings.some(item =>
        normalize(item.orderId) === normalize(order.id) &&
        item.status === "sold" &&
        !item.unitKey
      );

      if (hasLegacySold) return;

      ticketCore.createFromOrder(order);
    });
  }

  function getMyTickets() {
    const user = getUser();

    if (!user || !ticketCore?.getMine) return [];

    return ticketCore.getMine(user);
  }

  function statusLabel(ticket) {
    if (ticket.status === "used") {
      return "Đã check-in";
    }

    if (ticket.status === "valid") {
      return "Vé hợp lệ";
    }

    return "Không còn hiệu lực";
  }

  function createText(tag, content, className = "") {
    const element = document.createElement(tag);

    element.textContent = content;

    if (className) {
      element.className = className;
    }

    return element;
  }

  function showEmpty(title, description, login = false) {
    list.replaceChildren();

    const box = document.createElement("div");
    box.className = "empty";

    box.append(
      createText("h2", title),
      createText("p", description, "muted")
    );

    if (login) {
      const link = document.createElement("a");

      link.href =
        "auth.html?return=" +
        encodeURIComponent("my-tickets.html");

      link.className = "button primary";
      link.textContent = "Đăng nhập / Xác minh eKYC";

      box.appendChild(link);
    }

    list.appendChild(box);
  }

  function showTicketModal(ticket) {
    const user = getUser();

    if (!user) {
      alert("Vui lòng đăng nhập lại.");
      return;
    }

    // Luôn lấy dữ liệu mới nhất.
    const currentTicket = getMyTickets().find(
      item => item.id === ticket.id
    );

    if (!currentTicket) {
      alert("Bạn không còn sở hữu vé này.");
      renderTickets();
      return;
    }

    if (currentTicket.status !== "valid") {
      alert("Vé này không còn hiệu lực để check-in.");
      renderTickets();
      return;
    }

    const event = findEvent(currentTicket.eventId);

    modalEvent.textContent =
      event?.title ||
      currentTicket.eventTitle ||
      "Sự kiện";

    modalTicket.textContent =
      (currentTicket.ticketName || "Vé") +
      " — Mã vé: " + currentTicket.id;

    modalOrder.textContent =
      "Đơn mua gốc: " + currentTicket.orderId;

    ticketQR.replaceChildren();

    const token = currentTicket.qrToken;

    if (!token) {
      ticketQR.textContent = "Không tìm thấy mã QR.";
    } else if (typeof QRCode !== "undefined") {
      // QR chứa mã token hiện hành của chiếc vé.
      new QRCode(ticketQR, {
        text: token,
        width: 160,
        height: 160,
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      // Nếu thư viện QR chưa tải, vẫn hiện mã
      // để có thể nhập thủ công ở trang check-in.
      const code = createText("div", token);
      code.style.fontSize = "11px";
      code.style.padding = "10px";
      code.style.overflowWrap = "anywhere";

      ticketQR.appendChild(code);
    }

    modal?.classList.add("open");
  }

  function renderTickets() {
    if (!ticketCore) {
      showEmpty(
        "Không tải được dữ liệu vé",
        "Vui lòng kiểm tra file ticket-core.js."
      );
      return;
    }

    const user = getUser();

    if (!user) {
      showEmpty(
        "Bạn chưa đăng nhập hoặc chưa xác minh eKYC",
        "Đăng nhập và xác minh danh tính để xem vé.",
        true
      );
      return;
    }

    syncOldOrders();

    const tickets = getMyTickets().reverse();

    if (!tickets.length) {
      showEmpty(
        "Bạn chưa có vé",
        "Hãy mua vé hoặc mua lại vé trên sàn chính thức."
      );
      return;
    }

    list.replaceChildren();

    tickets.forEach(ticket => {
      const event = findEvent(ticket.eventId);

      const card = document.createElement("article");
      card.className = "ticket-card";

      const top = document.createElement("div");
      top.className = "ticket-top";

      const image = document.createElement("img");
      image.className = "ticket-image";
      image.src = event?.image || "";
      image.alt = event?.title || "Ảnh sự kiện";

      const info = document.createElement("div");
      info.className = "ticket-info";

      const title = createText(
        "h2",
        event?.title ||
          ticket.eventTitle ||
          "Sự kiện"
      );

      const date = createText(
        "p",
        "📅 " +
          (event?.date || "Đang cập nhật") +
          " · " +
          (event?.time || "")
      );

      const venue = createText(
        "p",
        "📍 " +
          (event?.venue || "Đang cập nhật")
      );

      const type = createText(
        "p",
        "🎫 Loại vé: " +
          (ticket.ticketName || "Vé")
      );

      const code = createText(
        "p",
        "Mã vé: " + ticket.id,
        "muted"
      );

      const status = createText(
        "span",
        statusLabel(ticket),
        "status"
      );

      if (ticket.status !== "valid") {
        status.style.background = "#4a3030";
        status.style.color = "#ffaaaa";
      }

      info.append(
        title,
        date,
        venue,
        type,
        code,
        status
      );

      top.append(image, info);

      const bottom = document.createElement("div");
      bottom.className = "ticket-bottom";

      const price = createText(
        "div",
        money(ticket.originalPrice),
        "price"
      );

      const actions = document.createElement("div");

      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "button primary";
      viewButton.textContent = "Xem vé / QR";
      viewButton.disabled = ticket.status !== "valid";

      viewButton.addEventListener("click", () => {
        showTicketModal(ticket);
      });

      actions.appendChild(viewButton);

      if (ticket.status === "valid") {
        const resaleLink = document.createElement("a");

        resaleLink.href = "resale.html";
        resaleLink.className = "button";
        resaleLink.textContent = "Bán lại vé";

        actions.appendChild(resaleLink);
      }

      bottom.append(price, actions);

      card.append(top, bottom);

      list.appendChild(card);
    });
  }

  closeModal?.addEventListener("click", () => {
    modal?.classList.remove("open");
  });

  modal?.addEventListener("click", event => {
    if (event.target === modal) {
      modal.classList.remove("open");
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      modal?.classList.remove("open");
    }
  });

  window.addEventListener("focus", renderTickets);

  window.addEventListener("storage", renderTickets);

  renderTickets();
})();
