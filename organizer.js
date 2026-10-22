
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const money = n =>
    new Intl.NumberFormat("vi-VN").format(
      Number(n) || 0
    ) + " đ";

  const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85";

  let editingEventId = null;

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

  function getEvents() {
    const saved = readArray("tt_events");

    const seeds = Array.isArray(window.TT_SEED_EVENTS)
      ? window.TT_SEED_EVENTS
      : [];

    const map = new Map();

    seeds.forEach(event => {
      map.set(String(event.id), event);
    });

    saved.forEach(event => {
      map.set(String(event.id), event);
    });

    return [...map.values()];
  }

  function saveEvents(events) {
    localStorage.setItem(
      "tt_events",
      JSON.stringify(events)
    );
  }

  function getOriginalOrders() {
    return readArray("tt_orders").filter(order =>
      order.status === "paid" &&
      order.type !== "resale" &&
      !order.resaleId
    );
  }

function isOwnEvent(event) {
  return (
    event.organizerId === "organizer-demo" ||
    !event.organizerId
  );
}

  function getStatus(event) {
    if (event.status === "pending") {
      return {
        text: "Chờ duyệt",
        className: "pending"
      };
    }

    if (event.status === "rejected") {
      return {
        text: "Bị từ chối",
        className: "rejected"
      };
    }

    if (
      event.status === "approved" ||
      event.status === "upcoming"
    ) {
      return {
        text: event.active === false
          ? "Đã đóng"
          : "Đã duyệt",
        className: event.active === false
          ? "closed"
          : "approved"
      };
    }

    return {
      text: "Chưa công bố",
      className: "closed"
    };
  }

  function renderStats() {
    const events = getEvents();
    const orders = getOriginalOrders();

    const ticketCount = orders.reduce((sum, order) => {
      const quantity = (order.items || []).reduce(
        (count, item) =>
          count + Number(item.quantity || 0),
        0
      );

      return sum + quantity;
    }, 0);

    const revenue = orders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0
    );

    $("statEvents").textContent = events.length;
    $("statTickets").textContent = ticketCount;
    $("statOrders").textContent = orders.length;
    $("statRevenue").textContent = money(revenue);
  }

  function createButton(text, className, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.style.margin = "3px";

    button.addEventListener("click", onClick);

    return button;
  }

  function renderEvents() {
    const tbody = $("eventTable");
    tbody.replaceChildren();

    const events = getEvents();

    if (!events.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.textContent = "Chưa có sự kiện nào.";

      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    events.forEach(event => {
      const row = document.createElement("tr");

      const name = document.createElement("td");
      name.textContent = event.title || "Sự kiện";

      if (event.rejectReason) {
        const reason = document.createElement("div");
        reason.style.color = "#ff9999";
        reason.style.fontSize = "12px";
        reason.style.marginTop = "7px";
        reason.textContent =
          "Lý do từ chối: " + event.rejectReason;

        name.appendChild(reason);
      }

      const date = document.createElement("td");
      date.textContent = event.date || "—";

      const venue = document.createElement("td");
      venue.textContent =
        event.venue || event.location || "—";

      const statusCell = document.createElement("td");
      const status = getStatus(event);

      const badge = document.createElement("span");
      badge.className = "status " + status.className;
      badge.textContent = status.text;

      statusCell.appendChild(badge);

      const actions = document.createElement("td");

      const view = document.createElement("a");
      view.className = "btn small outline";
      view.href =
        "event.html?id=" +
        encodeURIComponent(event.id);
      view.textContent = "Xem";
      view.style.margin = "3px";

      actions.appendChild(view);

      if (isOwnEvent(event)) {
        const edit = createButton(
          "✏️ Chỉnh sửa",
          "btn small",
          () => startEditing(event.id)
        );

        actions.appendChild(edit);

        // Chỉ cho đóng/mở sự kiện đã duyệt.
        if (
          event.status === "approved" ||
          event.status === "upcoming"
        ) {
          const toggle = createButton(
            event.active === false ? "Mở" : "Đóng",
            "btn small outline",
            () => toggleEvent(event.id)
          );

          actions.appendChild(toggle);
        }
      }

      row.append(
        name,
        date,
        venue,
        statusCell,
        actions
      );

      tbody.appendChild(row);
    });
  }

  function toggleEvent(id) {
    const events = getEvents();

    const target = events.find(
      event => String(event.id) === String(id)
    );

    if (!target || !isOwnEvent(target)) return;

    if (
      target.status !== "approved" &&
      target.status !== "upcoming"
    ) {
      alert("Chỉ được đóng/mở sự kiện đã duyệt.");
      return;
    }

    target.active = target.active === false;

    saveEvents(events);
    renderEvents();
    renderStats();
  }

  function renderOrders() {
    const tbody = $("orderTable");
    tbody.replaceChildren();

    const orders = getOriginalOrders().reverse();

    if (!orders.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.textContent = "Chưa có đơn hàng nào.";

      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    orders.forEach(order => {
      const row = document.createElement("tr");

      const quantity = (order.items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

      const values = [
        order.id || "—",
        order.eventTitle || "—",
        order.buyer?.email || "—",
        quantity,
        money(order.total)
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  }

  function addTicketRow(ticket = {}) {
    const row = document.createElement("div");
    row.className = "ticket-row";

    const nameWrap = document.createElement("div");
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Tên loại vé";

    const nameInput = document.createElement("input");
    nameInput.className = "ticket-name";
    nameInput.placeholder = "VIP, Tiêu chuẩn...";
    nameInput.value = ticket.name || "";
    nameInput.required = true;

    nameWrap.append(nameLabel, nameInput);

    const priceWrap = document.createElement("div");
    const priceLabel = document.createElement("label");
    priceLabel.textContent = "Giá vé (VNĐ)";

    const priceInput = document.createElement("input");
    priceInput.className = "ticket-price";
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "1000";
    priceInput.value = ticket.price ?? "";
    priceInput.required = true;

    priceWrap.append(priceLabel, priceInput);

    const quantityWrap = document.createElement("div");
    const quantityLabel = document.createElement("label");
    quantityLabel.textContent = "Số lượng";

    const quantityInput = document.createElement("input");
    quantityInput.className = "ticket-quantity";
    quantityInput.type = "number";
    quantityInput.min = "0";
    quantityInput.step = "1";
    quantityInput.value = ticket.quantity ?? "";
    quantityInput.required = true;

    quantityWrap.append(
      quantityLabel,
      quantityInput
    );

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn small outline";
    remove.textContent = "Xóa";

    remove.addEventListener("click", () => {
      if ($("ticketRows").children.length <= 1) {
        alert("Sự kiện cần ít nhất một loại vé.");
        return;
      }

      row.remove();
    });

    row.append(
      nameWrap,
      priceWrap,
      quantityWrap,
      remove
    );

    $("ticketRows").appendChild(row);
  }

  function resetForm() {
    editingEventId = null;

    $("eventForm").reset();
    $("ticketRows").replaceChildren();
    addTicketRow();

    const submit = $(
      "eventForm"
    ).querySelector('button[type="submit"]');

    submit.textContent = "Lưu sự kiện";

    $("formMessage").textContent = "";

    const cancel = $("cancelEditButton");

    if (cancel) cancel.remove();
  }

  function startEditing(id) {
    const event = getEvents().find(
      item => String(item.id) === String(id)
    );

    if (!event || !isOwnEvent(event)) {
      alert("Bạn không có quyền sửa sự kiện này.");
      return;
    }

    editingEventId = event.id;

    $("eventName").value = event.title || "";
    $("eventDate").value = event.date || "";
    $("eventTime").value = event.time || "";
    $("eventCity").value = event.location || "";
    $("eventVenue").value = event.venue || "";
    $("eventImage").value = event.image || "";
    $("eventDescription").value =
      event.description || "";

    $("ticketRows").replaceChildren();

    const ticketTypes = Array.isArray(event.ticketTypes)
      ? event.ticketTypes
      : [];

    if (ticketTypes.length) {
      ticketTypes.forEach(addTicketRow);
    } else {
      addTicketRow();
    }

    const submit = $("eventForm")
      .querySelector('button[type="submit"]');

    submit.textContent = "Lưu thay đổi và gửi duyệt";

    $("formMessage").textContent =
      "Đang chỉnh sửa: " + event.title +
      ". Khi lưu, sự kiện sẽ chuyển sang Chờ duyệt.";

    if (!$("cancelEditButton")) {
      const cancel = document.createElement("button");

      cancel.id = "cancelEditButton";
      cancel.type = "button";
      cancel.className = "btn outline";
      cancel.textContent = "Hủy chỉnh sửa";
      cancel.style.marginLeft = "10px";

      cancel.addEventListener("click", resetForm);

      submit.insertAdjacentElement(
        "afterend",
        cancel
      );
    }

    $("create").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  $("addTicket").addEventListener(
    "click",
    () => addTicketRow()
  );

  $("eventForm").addEventListener("submit", event => {
    event.preventDefault();

    const rows = [...$("ticketRows").children];

    const previous = editingEventId === null
      ? null
      : getEvents().find(
          item =>
            String(item.id) === String(editingEventId)
        );

    if (editingEventId !== null && !previous) {
      $("formMessage").textContent =
        "Không tìm thấy sự kiện cần chỉnh sửa.";
      return;
    }

    const oldTickets = Array.isArray(previous?.ticketTypes)
      ? previous.ticketTypes
      : [];

    const ticketTypes = rows.map((row, index) => {
      const old = oldTickets[index];

      return {
        id: old?.id || "ticket-" + (index + 1),
        name: row.querySelector(".ticket-name")
          .value.trim(),
        price: Number(
          row.querySelector(".ticket-price").value
        ),
        quantity: Number(
          row.querySelector(".ticket-quantity").value
        ),
        seated: old?.seated || false
      };
    });

    const invalid = ticketTypes.some(ticket =>
      !ticket.name ||
      !Number.isSafeInteger(ticket.price) ||
      ticket.price < 0 ||
      !Number.isSafeInteger(ticket.quantity) ||
      ticket.quantity < 0
    );

    if (invalid || !ticketTypes.length) {
      $("formMessage").textContent =
        "Vui lòng kiểm tra tên, giá và số lượng vé.";
      return;
    }

    const title = $("eventName").value.trim();
    const date = $("eventDate").value;
    const time = $("eventTime").value;
    const location = $("eventCity").value.trim();
    const venue = $("eventVenue").value.trim();

    if (
      !title ||
      !date ||
      !time ||
      !location ||
      !venue
    ) {
      $("formMessage").textContent =
        "Vui lòng nhập đầy đủ thông tin sự kiện.";
      return;
    }

    const events = getEvents();

    const current = editingEventId === null
      ? null
      : events.find(
          item =>
            String(item.id) === String(editingEventId)
        );

    if (editingEventId !== null && !current) {
      $("formMessage").textContent =
        "Sự kiện không còn tồn tại.";
      return;
    }

    if (current && !isOwnEvent(current)) {
      $("formMessage").textContent =
        "Bạn không có quyền chỉnh sửa sự kiện này.";
      return;
    }

    const now = new Date().toISOString();

    const updated = {
      ...(current || {}),
      id: current?.id || "ev-" + Date.now(),
      title,
      date,
      time,
      location,
      venue,
      image: $("eventImage").value.trim() ||
        current?.image ||
        DEFAULT_IMAGE,
      description: $("eventDescription").value.trim(),
      genre: current?.genre || "Âm nhạc",
      organizer: current?.organizer ||
        "Ticketbox Organizer",
      organizerId: "organizer-demo",
      price: Math.min(
        ...ticketTypes.map(ticket => ticket.price)
      ),
      free: ticketTypes.every(
        ticket => ticket.price === 0
      ),
      ticketTypes,
      active: true,
      status: "pending",
      rejectReason: "",
      createdAt: current?.createdAt || now,
      updatedAt: now
    };

    if (current) {
      const index = events.findIndex(
        item => String(item.id) === String(current.id)
      );

      events[index] = updated;
    } else {
      events.push(updated);
    }

    saveEvents(events);

    const message = current
      ? "✓ Đã lưu thay đổi! Sự kiện đang chờ Admin duyệt lại."
      : "✓ Đã tạo sự kiện! Đang chờ Admin duyệt.";

    resetForm();

    $("formMessage").textContent = message;

    renderEvents();
    renderStats();

    $("events").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  addTicketRow();
  renderEvents();
  renderOrders();
  renderStats();
})();
