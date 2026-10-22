
(() => {
  "use strict";

  const root = document.getElementById("checkoutApp");
  if (!root) return;

  const LIMIT = 2;
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  const money = value =>
    new Intl.NumberFormat("vi-VN").format(Number(value) || 0) + " đ";

  const $ = id => document.getElementById(id);

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function showNotice(title, message, link, linkText) {
    root.innerHTML = "";

    const box = document.createElement("section");
    box.className = "box";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = message;

    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.textContent = linkText;

    box.append(heading, description, anchor);
    root.appendChild(box);
  }

  // 1. Kiểm tra đăng nhập và eKYC
  const auth = window.TT_AUTH;

  if (!auth || typeof auth.getCurrentUser !== "function") {
    showNotice(
      "Không tải được hệ thống tài khoản",
      "Hãy kiểm tra auth.js đã được thêm trước checkout.js.",
      "index.html",
      "← Trang chủ"
    );
    return;
  }

  const currentUser = auth.getCurrentUser();

  const authReturn =
    "auth.html?return=" +
    encodeURIComponent(
      "checkout.html?id=" + encodeURIComponent(eventId || "")
    );

  if (!currentUser) {
    showNotice(
      "🔒 Vui lòng đăng nhập",
      "Bạn cần đăng nhập trước khi đặt vé.",
      authReturn,
      "Đăng nhập / Đăng ký →"
    );
    return;
  }

  if (
    !currentUser.verified ||
    !currentUser.verifiedIdentityId
  ) {
    showNotice(
      "🛡️ Cần xác minh danh tính",
      "Bạn phải hoàn thành eKYC giả lập trước khi mua vé.",
      authReturn,
      "Xác minh danh tính →"
    );
    return;
  }

  const identityId = currentUser.verifiedIdentityId;

  // 2. Đọc sự kiện: ưu tiên bản đã lưu, giữ sự kiện mẫu
  const eventMap = new Map();

  const seedEvents = Array.isArray(window.TT_SEED_EVENTS)
    ? window.TT_SEED_EVENTS
    : [];

  seedEvents.forEach(event => {
    if (event && event.id != null) {
      eventMap.set(String(event.id), event);
    }
  });

  readArray("tt_events").forEach(event => {
    if (event && event.id != null) {
      eventMap.set(String(event.id), event);
    }
  });

  const event = eventMap.get(String(eventId));

  if (!event) {
    showNotice(
      "Không tìm thấy sự kiện",
      "Sự kiện này không tồn tại.",
      "index.html",
      "← Về trang chủ"
    );
    return;
  }

  const blockedStatuses = [
    "pending",
    "rejected",
    "draft",
    "hidden",
    "ended"
  ];

  if (blockedStatuses.includes(event.status)) {
    showNotice(
      "Sự kiện chưa mở bán",
      "Sự kiện này hiện không cho phép đặt vé.",
      "index.html",
      "← Về trang chủ"
    );
    return;
  }

  const eventDate = String(event.date || "");
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDate)
    ? new Date(eventDate + "T23:59:59")
    : null;

  if (
    parsedDate &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate < new Date()
  ) {
    showNotice(
      "Sự kiện đã kết thúc",
      "Không thể đặt vé cho sự kiện đã diễn ra.",
      "event.html?id=" + encodeURIComponent(event.id),
      "← Quay lại sự kiện"
    );
    return;
  }

  document.title =
    "Đặt vé - " + event.title + " | Ticketbox";

  const ticketTypes = Array.isArray(event.ticketTypes)
    ? event.ticketTypes
    : [];

  if (!ticketTypes.length) {
    showNotice(
      "Chưa có loại vé",
      "Ban tổ chức chưa thiết lập vé cho sự kiện này.",
      "event.html?id=" + encodeURIComponent(event.id),
      "← Quay lại sự kiện"
    );
    return;
  }

  // 3. Đếm vé đã mua theo danh tính, không theo email
  function countPurchased() {
    return readArray("tt_orders")
      .filter(order =>
        String(order.eventId) === String(event.id) &&
        order.status === "paid" &&
        order.buyer?.verifiedIdentityId === identityId
      )
      .reduce((sum, order) => {
        if (!Array.isArray(order.items)) return sum;

        return sum + order.items.reduce(
          (total, item) =>
            total + Math.max(0, Number(item.quantity) || 0),
          0
        );
      }, 0);
  }

  function remainingLimit() {
    return Math.max(0, LIMIT - countPurchased());
  }

  function totalSelected() {
    return Object.values(selected).reduce(
      (sum, qty) => sum + qty,
      0
    );
  }

  // 4. Kiểm tra tài khoản có bị đổi ở tab khác không
  function activeIdentityIsValid() {
    const activeUser = auth.getCurrentUser();

    return Boolean(
      activeUser &&
      activeUser.verified &&
      activeUser.id === currentUser.id &&
      activeUser.verifiedIdentityId === identityId
    );
  }

  const selected = {};

  ticketTypes.forEach(ticket => {
    selected[ticket.id] = 0;
  });

  // 5. Dựng giao diện
  root.innerHTML = `
    <div class="layout">
      <div>
        <section class="box">
          <h2>Chọn loại vé</h2>

          <p class="muted" id="eventName"></p>

          <div
            id="identityNotice"
            style="
              background:#173326;
              border:1px solid #39835a;
              border-radius:10px;
              padding:14px;
              margin-bottom:18px;
              line-height:1.7;
            "
          ></div>

          <div id="ticketList"></div>
        </section>

        <section class="box">
          <h2>Thông tin người mua</h2>

          <form id="checkoutForm">
            <div class="form-group">
              <label for="buyerName">Họ và tên</label>
              <input
                id="buyerName"
                required
                placeholder="Nhập họ tên"
                readonly
              >
            </div>

            <div class="form-group">
              <label for="buyerEmail">Email tài khoản</label>
              <input
                id="buyerEmail"
                type="email"
                required
                readonly
              >
            </div>

            <div class="form-group">
              <label for="buyerPhone">Số điện thoại</label>
              <input
                id="buyerPhone"
                type="tel"
                required
                pattern="[0-9]{10,11}"
                placeholder="Nhập 10–11 chữ số"
              >
            </div>

            <p class="muted" style="font-size:13px">
              Hạn mức mua vé được tính theo danh tính
              đã xác minh, không phải email.
            </p>

            <p id="checkoutMessage" class="error"></p>

            <button
              type="submit"
              class="button"
              id="payButton"
            >
              Tiếp tục thanh toán →
            </button>
          </form>
        </section>
      </div>

      <aside>
        <section class="box">
          <h2>Đơn hàng của bạn</h2>

          <div id="orderItems" class="muted">
            Chưa chọn vé
          </div>

          <hr style="border-color:#343944">

          <div class="summary-row">
            <strong>Tổng số vé</strong>
            <span id="totalTickets">0</span>
          </div>

          <div class="summary-row">
            <strong>Tổng thanh toán</strong>
            <span class="total" id="totalPrice">0 đ</span>
          </div>

          <p class="muted" style="font-size:13px">
            Đây là thanh toán mô phỏng.
            Website không thu tiền thật.
          </p>
        </section>
      </aside>
    </div>
  `;

  $("eventName").textContent = event.title;
  $("buyerName").value = currentUser.name || "";
  $("buyerEmail").value = currentUser.email || "";

  // 6. Sơ đồ khu vực
  const map = document.createElement("div");
  map.className = "seatmap";

  const stage = document.createElement("div");
  stage.className = "stage";
  stage.textContent = "SÂN KHẤU";

  const zoneGrid = document.createElement("div");
  zoneGrid.className = "zone-grid";

  const hint = document.createElement("p");
  hint.className = "zone-hint";
  hint.textContent = "Bấm vào khu vực để chọn vé";

  map.append(stage, zoneGrid, hint);
  $("ticketList").before(map);

  const zoneButtons = {};
  const controls = {};

  function stockOf(ticket) {
    return Math.max(0, Number(ticket.quantity) || 0);
  }

  ticketTypes.forEach(ticket => {
    const zone = document.createElement("button");

    zone.type = "button";
    zone.className = "zone";

    const name = document.createElement("strong");
    name.textContent = ticket.name;

    const price = document.createElement("small");
    price.textContent = Number(ticket.price) === 0
      ? "Miễn phí"
      : money(ticket.price);

    zone.append(name, price);
    zoneGrid.appendChild(zone);

    zoneButtons[ticket.id] = zone;

    zone.addEventListener("click", () => {
      addTicket(ticket);

      document.querySelectorAll(".zone").forEach(btn => {
        btn.classList.remove("active");
      });

      if (selected[ticket.id] > 0) {
        zone.classList.add("active");
      }
    });
  });

  // 7. Danh sách vé và nút cộng trừ
  ticketTypes.forEach(ticket => {
    const row = document.createElement("div");
    row.className = "ticket-row";

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = ticket.name;

    const price = document.createElement("div");
    price.className = "ticket-price";
    price.textContent = Number(ticket.price) === 0
      ? "Miễn phí"
      : money(ticket.price);

    const stock = document.createElement("small");
    stock.className = "muted";
    stock.textContent = "Số lượng mở bán: " + stockOf(ticket);

    details.append(name, price, stock);

    const quantity = document.createElement("div");
    quantity.className = "quantity";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";

    const count = document.createElement("span");
    count.textContent = "0";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";

    minus.addEventListener("click", () => {
      if (selected[ticket.id] > 0) {
        selected[ticket.id]--;
        update();
      }
    });

    plus.addEventListener("click", () => {
      addTicket(ticket);
    });

    quantity.append(minus, count, plus);
    row.append(details, quantity);

    $("ticketList").appendChild(row);

    controls[ticket.id] = {
      minus,
      plus,
      count
    };
  });

  function addTicket(ticket) {
    if (!activeIdentityIsValid()) {
      $("checkoutMessage").textContent =
        "Phiên tài khoản đã thay đổi. Vui lòng tải lại trang.";
      return;
    }

    const remaining = remainingLimit();

    if (totalSelected() >= remaining) {
      hint.textContent =
        "Bạn chỉ còn được mua thêm " +
        remaining + " vé cho sự kiện này.";
      update();
      return;
    }

    if (selected[ticket.id] >= stockOf(ticket)) {
      hint.textContent = "Loại vé này đã đạt số lượng mở bán.";
      return;
    }

    selected[ticket.id]++;
    update();

    hint.textContent =
      "Đã chọn khu vực " +
      ticket.name +
      " — " +
      money(ticket.price);
  }

  // 8. Cập nhật số lượng và hạn mức
  function update() {
    const purchased = countPurchased();
    const remaining = remainingLimit();

    let totalTickets = 0;
    let totalPrice = 0;

    const orderLines = [];

    ticketTypes.forEach(ticket => {
      const qty = selected[ticket.id];

      totalTickets += qty;
      totalPrice += qty * Number(ticket.price || 0);

      controls[ticket.id].count.textContent = qty;
      controls[ticket.id].minus.disabled = qty === 0;

      if (qty > 0) {
        orderLines.push(
          ticket.name + " × " + qty +
          " — " + money(qty * Number(ticket.price || 0))
        );
      }
    });

    ticketTypes.forEach(ticket => {
      const full =
        selected[ticket.id] >= stockOf(ticket) ||
        totalTickets >= remaining;

      controls[ticket.id].plus.disabled = full;
      zoneButtons[ticket.id].disabled = full;
    });

    $("identityNotice").textContent =
      "✓ Đã xác minh eKYC (DEMO)" +
      "\nMã danh tính: " + identityId +
      "\nĐã mua: " + purchased + "/" + LIMIT + " vé" +
      "\nCòn được mua: " + remaining + " vé";

    $("identityNotice").style.whiteSpace = "pre-line";

    $("totalTickets").textContent = totalTickets;
    $("totalPrice").textContent = money(totalPrice);

    const orderItems = $("orderItems");
    orderItems.replaceChildren();

    if (!orderLines.length) {
      orderItems.textContent = "Chưa chọn vé";
    } else {
      orderLines.forEach(line => {
        const p = document.createElement("p");
        p.textContent = line;
        orderItems.appendChild(p);
      });
    }

    $("payButton").disabled =
      totalTickets === 0 ||
      totalTickets > remaining ||
      !activeIdentityIsValid();

    if (remaining === 0) {
      $("checkoutMessage").textContent =
        "Bạn đã mua đủ 2 vé cho sự kiện này.";
    } else {
      $("checkoutMessage").textContent = "";
    }
  }

  update();

  // 9. Tạo bản nháp thanh toán
  $("checkoutForm").addEventListener("submit", eventSubmit => {
    eventSubmit.preventDefault();

    if (!activeIdentityIsValid()) {
      alert("Phiên đăng nhập đã thay đổi. Vui lòng tải lại.");
      return;
    }

    const items = ticketTypes
      .filter(ticket => selected[ticket.id] > 0)
      .map(ticket => ({
        ticketTypeId: ticket.id,
        name: ticket.name,
        price: Number(ticket.price),
        quantity: selected[ticket.id]
      }));

    const quantity = items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    if (quantity <= 0) {
      alert("Vui lòng chọn ít nhất 1 vé.");
      return;
    }

    if (quantity > remainingLimit()) {
      alert(
        "Bạn đã vượt hạn mức 2 vé / danh tính / sự kiện."
      );
      update();
      return;
    }

    const phone = $("buyerPhone").value.trim();

    if (!/^[0-9]{10,11}$/.test(phone)) {
      alert("Số điện thoại phải có 10–11 chữ số.");
      return;
    }

    const buyer = {
      name: currentUser.name,
      email: currentUser.email,
      phone,
      userId: currentUser.id,
      verifiedIdentityId: identityId
    };

    const total = items.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );

    const draft = {
      type: "original",
      eventId: event.id,
      eventTitle: event.title,
      buyer,
      items,
      total,
      createdAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(
        "tt_payment_draft",
        JSON.stringify(draft)
      );
    } catch {
      alert("Không thể lưu thông tin đặt vé.");
      return;
    }

    window.location.href =
      "payment.html?id=" + encodeURIComponent(event.id);
  });

  // Cập nhật khi người dùng quay lại tab
  window.addEventListener("focus", update);
})();
