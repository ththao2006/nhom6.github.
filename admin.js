
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const money = n =>
    new Intl.NumberFormat("vi-VN").format(
      Number(n) || 0
    ) + " đ";

  function read(key) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  // Lấy cả sự kiện mẫu và sự kiện BTC tạo.
  function getEvents() {
    const map = new Map();

    const seeds = Array.isArray(window.TT_SEED_EVENTS)
      ? window.TT_SEED_EVENTS
      : [];

    seeds.forEach(event => {
      map.set(String(event.id), event);
    });

    read("tt_events").forEach(event => {
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

  // Sự kiện mẫu và sự kiện cũ vẫn được xem là đã duyệt.
  function status(event) {
    if (
      ["pending", "approved", "rejected"]
        .includes(event.status)
    ) {
      return event.status;
    }

    return "approved";
  }

  const statusText = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối"
  };

  function cell(row, value) {
    const td = document.createElement("td");
    td.textContent = String(value ?? "—");
    row.appendChild(td);
    return td;
  }

  function empty(tbody, columns, message) {
    const row = document.createElement("tr");
    const td = cell(row, message);

    td.colSpan = columns;
    tbody.appendChild(row);
  }

  function button(label, className, handler) {
    const btn = document.createElement("button");

    btn.type = "button";
    btn.className = "btn small " + className;
    btn.textContent = label;
    btn.addEventListener("click", handler);

    return btn;
  }

  // Duyệt hoặc từ chối sự kiện.
  function setStatus(id, nextStatus) {
    const events = getEvents();

    const event = events.find(
      item => String(item.id) === String(id)
    );

    if (!event) return;

    if (nextStatus === "rejected") {
      const reason = prompt(
        "Nhập lý do từ chối sự kiện:",
        "Thông tin chưa đầy đủ"
      );

      if (reason === null) return;

      if (!reason.trim()) {
        alert("Vui lòng nhập lý do từ chối.");
        return;
      }

      event.rejectReason = reason.trim();
    } else {
      delete event.rejectReason;
    }

    event.status = nextStatus;

    saveEvents(events);
    render();
  }

  function renderEvents(events) {
    const pendingTable = $("pendingTable");
    const allTable = $("eventTable");

    pendingTable.replaceChildren();
    allTable.replaceChildren();

    const pending = events.filter(
      event => status(event) === "pending"
    );

    if (!pending.length) {
      empty(
        pendingTable,
        5,
        "Hiện chưa có sự kiện chờ duyệt."
      );
    }

    pending.forEach(event => {
      const row = document.createElement("tr");

      cell(row, event.title || "Sự kiện");
      cell(row, event.date || "—");
      cell(
        row,
        event.venue || event.location || "—"
      );
      cell(
        row,
        event.organizer || "Ban tổ chức"
      );

      const actions = document.createElement("td");

      actions.append(
        button("✓ Duyệt", "", () => {
          setStatus(event.id, "approved");
        }),

        button("✕ Từ chối", "danger", () => {
          setStatus(event.id, "rejected");
        })
      );

      row.appendChild(actions);
      pendingTable.appendChild(row);
    });

    if (!events.length) {
      empty(
        allTable,
        5,
        "Chưa có sự kiện."
      );
    }

    events.slice().reverse().forEach(event => {
      const row = document.createElement("tr");

      cell(row, event.title || "Sự kiện");
      cell(row, event.date || "—");

      const prices = (event.ticketTypes || [])
        .map(ticket => Number(ticket.price))
        .filter(Number.isFinite);

      const minPrice = event.price ??
        (prices.length ? Math.min(...prices) : 0);

      cell(row, money(minPrice));

      const statusCell = document.createElement("td");
      const badge = document.createElement("span");

      badge.className =
        "status " + status(event);

      badge.textContent =
        statusText[status(event)];

      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      const actions = document.createElement("td");

      const view = document.createElement("a");

      view.href =
        "event.html?id=" +
        encodeURIComponent(event.id);

      view.className = "btn small outline";
      view.textContent = "Xem";

      actions.appendChild(view);

      if (status(event) === "rejected") {
        actions.appendChild(
          button("Duyệt lại", "", () => {
            setStatus(event.id, "approved");
          })
        );
      }

      if (
        status(event) === "approved" &&
        String(event.id).startsWith("ev-")
      ) {
        actions.appendChild(
          button("Thu hồi", "danger", () => {
            if (
              confirm(
                "Thu hồi duyệt sự kiện này?"
              )
            ) {
              setStatus(event.id, "rejected");
            }
          })
        );
      }

      row.appendChild(actions);
      allTable.appendChild(row);
    });
  }

  // Đơn hàng đã thanh toán.
  function renderOrders() {
    const orders = read("tt_orders").filter(
      order => order.status === "paid"
    );

    const tbody = $("orderTable");
    tbody.replaceChildren();

    if (!orders.length) {
      empty(
        tbody,
        5,
        "Chưa có đơn hàng đã thanh toán."
      );
    }

    orders.slice().reverse().forEach(order => {
      const row = document.createElement("tr");

      const quantity = (order.items || [])
        .reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0),
          0
        );

      const values = [
        order.id,
        order.eventTitle,
        order.buyer?.email ||
          order.buyer?.name ||
          "—",
        quantity,
        money(order.total)
      ];

      values.forEach(value => {
        cell(row, value);
      });

      tbody.appendChild(row);
    });

    return orders;
  }

  // Kiểm tra giới hạn giá bán lại 110%.
  function renderResales() {
    const listings = read("tt_resales");
    const tbody = $("resaleTable");

    tbody.replaceChildren();

    if (!listings.length) {
      empty(
        tbody,
        5,
        "Chưa có vé đăng bán lại."
      );
    }

    listings.slice().reverse().forEach(listing => {
      const row = document.createElement("tr");

      const original = Number(
        listing.originalPrice ??
        listing.original_price ??
        listing.faceValue ??
        listing.facePrice ??
        0
      );

      const asking = Number(
        listing.price ??
        listing.resalePrice ??
        listing.askingPrice ??
        0
      );

      const valid =
        original > 0 &&
        asking >= 0 &&
        asking <= Math.round(original * 1.1);

      cell(
        row,
        listing.eventTitle ||
          listing.title ||
          "—"
      );

      cell(
        row,
        original ? money(original) : "Chưa rõ"
      );

      cell(row, money(asking));

      cell(
        row,
        original
          ? (
              valid
                ? "✓ Trong giới hạn"
                : "⚠ Vượt 110%"
            )
          : "Chưa đủ dữ liệu"
      );

      cell(
        row,
        listing.status || "Đang đăng"
      );

      tbody.appendChild(row);
    });
  }

  function render() {
    const events = getEvents();

    renderEvents(events);

    const orders = renderOrders();
    renderResales();

    $("statEvents").textContent =
      events.length;

    $("statPending").textContent =
      events.filter(
        event => status(event) === "pending"
      ).length;

    $("statOrders").textContent =
      orders.length;

    const revenue = orders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0
    );

    $("statRevenue").textContent =
      money(revenue);
  }

  render();

  window.addEventListener("storage", render);
})();
