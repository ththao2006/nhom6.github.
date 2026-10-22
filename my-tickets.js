
(() => {
  const list = document.getElementById("ticketList");
  const modal = document.getElementById("ticketModal");

  const money = n =>
    new Intl.NumberFormat("vi-VN").format(n) + " đ";

  let orders = [];
  let events = window.TT_SEED_EVENTS || [];

  try {
    const savedOrders = JSON.parse(
      localStorage.getItem("tt_orders") || "[]"
    );
    if (Array.isArray(savedOrders)) orders = savedOrders;

    const savedEvents = JSON.parse(
      localStorage.getItem("tt_events") || "null"
    );
    if (Array.isArray(savedEvents)) events = savedEvents;
  } catch (error) {
    console.warn("Không đọc được dữ liệu:", error);
  }

  // Chỉ hiện đơn hàng demo đã thanh toán
  const paidOrders = orders
    .filter(order => order.status === "paid")
    .reverse();

  if (paidOrders.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <h2>Bạn chưa có vé nào</h2>
        <p class="muted">
          Hãy khám phá sự kiện và đặt vé đầu tiên!
        </p>
        <a href="index.html" class="button primary">
          Khám phá sự kiện
        </a>
      </div>
    `;
    return;
  }

  list.replaceChildren();

  paidOrders.forEach(order => {
    const event = events.find(e => e.id === order.eventId);

    const card = document.createElement("article");
    card.className = "ticket-card";

    const top = document.createElement("div");
    top.className = "ticket-top";

    const image = document.createElement("img");
    image.className = "ticket-image";
    image.alt = "Ảnh sự kiện";
    if (event?.image) image.src = event.image;

    const info = document.createElement("div");
    info.className = "ticket-info";

    const title = document.createElement("h2");
    title.textContent = order.eventTitle || "Sự kiện";

    const date = document.createElement("p");
    date.textContent = event
      ? "📅 " + event.date + " · " + (event.time || "")
      : "Không có thông tin ngày";

    const venue = document.createElement("p");
    venue.textContent = event
      ? "📍 " + event.venue + " · " + event.location
      : "";

    const types = document.createElement("p");
    types.textContent = (order.items || [])
      .map(t => t.name + " × " + t.quantity)
      .join(" · ");

    const status = document.createElement("span");
    status.className = "status";
    status.textContent = "Đã thanh toán (demo)";

    info.append(title, date, venue, types, status);
    top.append(image, info);

    const bottom = document.createElement("div");
    bottom.className = "ticket-bottom";

    const summary = document.createElement("div");

    const code = document.createElement("div");
    code.className = "muted";
    code.textContent = "Mã đơn: " + order.id;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = money(order.total || 0);

    summary.append(code, price);

    const actions = document.createElement("div");

    const view = document.createElement("button");
    view.className = "button primary";
    view.textContent = "Xem vé / QR";
    view.addEventListener("click", () => openTicket(order));

    const resale = document.createElement("button");
    resale.className = "button";
    resale.textContent = "Bán lại vé";
    resale.addEventListener("click", () => {
      alert("Chức năng bán lại vé sẽ được làm ở bước tiếp theo!");
    });

    actions.append(view, resale);
    bottom.append(summary, actions);

    card.append(top, bottom);
    list.appendChild(card);
  });

  function openTicket(order) {
    document.getElementById("modalEvent").textContent =
      order.eventTitle;

    document.getElementById("modalTicket").textContent =
      (order.items || [])
        .map(t => t.name + " × " + t.quantity)
        .join(" · ");

    document.getElementById("modalOrder").textContent =
      "Mã đơn hàng: " + order.id;

    // QR trang trí, không phải QR check-in thực tế.
    document.getElementById("ticketQR").innerHTML = `
      <svg viewBox="0 0 100 100"
           xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white"/>
        <g fill="#111">
          <path d="M3 3h30v30H3zM67 3h30v30H67zM3 67h30v30H3z"/>
          <path d="M9 9h18v18H9zM73 9h18v18H73zM9 73h18v18H9z"
                fill="white"/>
          <path d="M14 14h8v8h-8zM78 14h8v8h-8zM14 78h8v8h-8z"/>
          <path d="M40 5h7v7h-7zM52 5h8v8h-8z
                   M39 20h9v9h-9zM53 24h9v7h-9z
                   M40 39h12v12H40zM58 40h8v8h-8z
                   M72 40h9v9h-9zM87 40h8v8h-8z
                   M5 40h9v9H5zM20 40h9v9h-9z
                   M5 54h8v8H5zM20 55h11v7H20z
                   M39 60h9v9h-9zM55 57h8v8h-8z
                   M70 57h9v9h-9zM85 57h10v8H85z
                   M40 77h10v8H40zM56 72h9v10h-9z
                   M72 76h10v9H72zM88 86h9v9h-9z"/>
        </g>
      </svg>
    `;

    modal.classList.add("open");
  }

  document.getElementById("closeModal")
    .addEventListener("click", () => {
      modal.classList.remove("open");
    });

  modal.addEventListener("click", e => {
    if (e.target === modal) {
      modal.classList.remove("open");
    }
  });
})();
