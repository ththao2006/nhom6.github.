
(() => {
  const $ = id => document.getElementById(id);

  const money = n =>
    new Intl.NumberFormat("vi-VN").format(n) + " đ";

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

  const seedEvents = window.TT_SEED_EVENTS || [];

  // Gộp sự kiện mẫu và sự kiện đã tạo.
  function getEvents() {
    const saved = readArray("tt_events");
    const map = new Map();

    seedEvents.forEach(event => {
      map.set(event.id, event);
    });

    saved.forEach(event => {
      map.set(event.id, event);
    });

    return [...map.values()];
  }

  function saveEvents(events) {
    localStorage.setItem(
      "tt_events",
      JSON.stringify(events)
    );
  }

  // Đọc đơn hàng từ luồng payment.html.
  // Không tính giao dịch bán lại vào doanh thu BTC.
  function getOriginalOrders() {
    return readArray("tt_orders").filter(order =>
      order.status === "paid" &&
      order.type !== "resale" &&
      !order.resaleId
    );
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

      const date = document.createElement("td");
      date.textContent = event.date || "—";

      const venue = document.createElement("td");
      venue.textContent =
        event.venue || event.location || "—";

      const statusCell = document.createElement("td");
      const badge = document.createElement("span");

      const active = event.active !== false;

      badge.className = active
        ? "status"
        : "status closed";

      badge.textContent = active
        ? "Đang mở"
        : "Đã đóng";

      statusCell.appendChild(badge);

      const actions = document.createElement("td");

      const view = document.createElement("a");
      view.className = "btn small outline";
      view.href =
        "event.html?id=" +
        encodeURIComponent(event.id);
      view.textContent = "Xem";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn small outline";
      toggle.style.marginLeft = "7px";
      toggle.textContent = active ? "Đóng" : "Mở";

      toggle.addEventListener("click", () => {
        const all = getEvents();
        const target = all.find(e => e.id === event.id);

        if (!target) return;

        target.active = !active;
        saveEvents(all);

        renderEvents();
        renderStats();
      });

      actions.append(view, toggle);

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
        money(Number(order.total || 0))
      ];

      values.forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  }

  // Tạo một dòng nhập loại vé.
  function addTicketRow() {
    const row = document.createElement("div");
    row.className = "ticket-row";

    const nameWrap = document.createElement("div");
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Tên loại vé";

    const nameInput = document.createElement("input");
    nameInput.className = "ticket-name";
    nameInput.placeholder = "VIP, Standard...";
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
    priceInput.required = true;

    priceWrap.append(priceLabel, priceInput);

    const quantityWrap = document.createElement("div");
    const quantityLabel = document.createElement("label");
    quantityLabel.textContent = "Số lượng";

    const quantityInput = document.createElement("input");
    quantityInput.className = "ticket-quantity";
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.step = "1";
    quantityInput.required = true;

    quantityWrap.append(quantityLabel, quantityInput);

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

  $("addTicket").addEventListener("click", addTicketRow);

  $("eventForm").addEventListener("submit", event => {
    event.preventDefault();

    const rows = [...$("ticketRows").children];

    const ticketTypes = rows.map((row, index) => ({
      id: "ticket-" + (index + 1),
      name: row.querySelector(".ticket-name")
        .value.trim(),
      price: Number(
        row.querySelector(".ticket-price").value
      ),
      quantity: Number(
        row.querySelector(".ticket-quantity").value
      ),
      seated: false
    }));

    const invalid = ticketTypes.some(ticket =>
      !ticket.name ||
      !Number.isSafeInteger(ticket.price) ||
      ticket.price < 0 ||
      !Number.isSafeInteger(ticket.quantity) ||
      ticket.quantity < 1
    );

    if (invalid) {
      $("formMessage").textContent =
        "Vui lòng kiểm tra tên, giá và số lượng vé.";
      return;
    }

    const now = Date.now();

    const newEvent = {
      id: "ev-" + now,
      title: $("eventName").value.trim(),
      date: $("eventDate").value,
      time: $("eventTime").value,
      location: $("eventCity").value.trim(),
      venue: $("eventVenue").value.trim(),
      image: $("eventImage").value.trim() ||
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85",
      description: $("eventDescription").value.trim(),
      genre: "Âm nhạc",
      organizer: "Ticketbox Organizer",
      organizerId: "organizer-demo",
      price: Math.min(
        ...ticketTypes.map(ticket => ticket.price)
      ),
      free: ticketTypes.every(ticket =>
        ticket.price === 0
      ),
      ticketTypes,
      active: true,
      status: "upcoming",
      createdAt: new Date().toISOString()
    };

    if (
      !newEvent.title ||
      !newEvent.date ||
      !newEvent.time ||
      !newEvent.location ||
      !newEvent.venue
    ) {
      $("formMessage").textContent =
        "Vui lòng nhập đủ thông tin sự kiện.";
      return;
    }

    const events = getEvents();
    events.push(newEvent);
    saveEvents(events);

    $("eventForm").reset();
    $("ticketRows").replaceChildren();
    addTicketRow();

    $("formMessage").textContent =
      "✓ Tạo sự kiện thành công (DEMO)!";

    renderEvents();
    renderStats();
  });

  addTicketRow();
  renderEvents();
  renderOrders();
  renderStats();
})();
