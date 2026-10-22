
(() => {
  const $ = id => document.getElementById(id);
  const money = n =>
    new Intl.NumberFormat("vi-VN").format(n) + " đ";

  const params = new URLSearchParams(location.search);
  const eventId = params.get("id") || "ev001";

  let events = window.TT_SEED_EVENTS || [];

  try {
    const saved = JSON.parse(localStorage.getItem("tt_events"));
    if (Array.isArray(saved)) events = saved;
  } catch {}

  const event = events.find(e => e.id === eventId);

  if (!event) {
    $("eventTitle").textContent = "Không tìm thấy sự kiện";
    $("paymentApp").classList.add("hidden");
    return;
  }

  $("eventTitle").textContent = event.title;
  $("eventDate").textContent =
    "📅 " + event.date + " · " + (event.time || "");
  $("eventVenue").textContent =
    "📍 " + event.venue + " · " + event.location;

  $("backLink").href =
    "checkout.html?id=" + encodeURIComponent(event.id);

  document.title = "Thanh toán | " + event.title;

  // Chỉ dùng đơn hàng tạm khi sau này
  // kết nối từ trang checkout.
  let draft = null;

  try {
    draft = JSON.parse(sessionStorage.getItem("tt_payment_draft"));
  } catch {}

  const validDraft =
    draft &&
    draft.eventId === event.id &&
    Array.isArray(draft.items) &&
    draft.items.length > 0;

  // Chế độ xem thử khi mở payment.html trực tiếp.
  const items = validDraft
    ? draft.items
    : [{
        ticketTypeId: event.ticketTypes[0].id,
        name: event.ticketTypes[0].name,
        price: event.ticketTypes[0].price,
        quantity: 1
      }];

  const buyer = validDraft ? (draft.buyer || {}) : {};

  if (buyer.email) {
    $("receiverEmail").value = buyer.email;
  }

  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  let discount = 0;
  let completed = false;
  let expired = false;

  $("ticketSummary").replaceChildren();

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "summary-row";

    const name = document.createElement("span");
    name.textContent = item.name + " × " + item.quantity;

    const price = document.createElement("strong");
    price.textContent =
      money(Number(item.price) * Number(item.quantity));

    row.append(name, price);
    $("ticketSummary").appendChild(row);
  });

  function updateTotal() {
    $("subtotal").textContent = money(subtotal);
    $("discount").textContent =
      discount ? "−" + money(discount) : "0 đ";
    $("grandTotal").textContent = money(subtotal - discount);
  }

  function updateButton() {
    $("payButton").disabled =
      !$("agreeTerms").checked || expired || completed;
  }

  updateTotal();
  updateButton();

  $("agreeTerms").addEventListener("change", updateButton);

  $("applyVoucher").addEventListener("click", () => {
    const code = $("voucherInput").value.trim().toUpperCase();

    if (code === "DEMO10") {
      discount = Math.round(subtotal * 0.1);
      $("voucherMessage").textContent =
        "Đã áp dụng giảm giá 10%!";
      $("voucherMessage").className = "message success";
    } else {
      discount = 0;
      $("voucherMessage").textContent =
        "Mã không hợp lệ. Thử DEMO10.";
      $("voucherMessage").className = "message error";
    }

    updateTotal();
  });

  // Đồng hồ 15 phút, giữ thời hạn qua lần tải lại.
  const deadlineKey = "tt_payment_deadline_" + event.id;
  let deadline = Number(sessionStorage.getItem(deadlineKey));

  if (!deadline || !Number.isFinite(deadline)) {
    deadline = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem(deadlineKey, String(deadline));
  }

  const timerInterval = setInterval(updateTimer, 1000);

  function updateTimer() {
    const remaining = Math.max(
      0,
      Math.ceil((deadline - Date.now()) / 1000)
    );

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    $("timer").textContent =
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");

    if (remaining === 0) {
      clearInterval(timerInterval);
      expired = true;
      updateButton();
      $("paymentMessage").textContent =
        "Hết thời gian giữ vé. Hãy chọn lại vé.";
      $("paymentMessage").className = "message error";
    }
  }

  updateTimer();

  $("payButton").addEventListener("click", () => {
    if (expired || completed) return;

    const email = $("receiverEmail").value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $("paymentMessage").textContent =
        "Vui lòng nhập email nhận vé hợp lệ.";
      $("paymentMessage").className = "message error";
      $("receiverEmail").focus();
      return;
    }

    const method = document.querySelector(
      'input[name="method"]:checked'
    ).value;

    const total = subtotal - discount;

    $("paymentApp").classList.add("hidden");
    $("resultScreen").classList.remove("hidden");

    const result = $("resultScreen");
    result.replaceChildren();

    const screen = document.createElement("div");
    screen.className = "qr-screen";

    const title = document.createElement("h2");
    title.textContent = "Xác nhận thanh toán demo";

    const methodText = document.createElement("p");
    const methodNames = {
      vnpay: "VNPAY",
      vietqr: "VietQR",
      shopeepay: "ShopeePay",
      zalopay: "ZaloPay",
      card: "Thẻ ngân hàng"
    };

    methodText.textContent =
      "Phương thức: " + methodNames[method];

    const amount = document.createElement("h2");
    amount.textContent = money(total);
    amount.style.color = "#27c477";

    const note = document.createElement("p");
    note.textContent =
      "Mã QR minh họa, không dùng để chuyển tiền thật.";

    // Hình QR cách điệu, KHÔNG phải QR ngân hàng.
    const qr = document.createElement("div");
    qr.className = "qr-visual";
    qr.innerHTML = `
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

    const confirm = document.createElement("button");
    confirm.className = "pay-button";
    confirm.textContent = "Xác nhận đã thanh toán (DEMO)";

    confirm.addEventListener("click", () => {
      if (completed || expired) return;

      const order = {
        id: "ORD-" + Date.now(),
        eventId: event.id,
        eventTitle: event.title,
        buyer: {
          ...buyer,
          email
        },
        items: items.map(item => ({
          ticketTypeId: item.ticketTypeId,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity)
        })),
        subtotal,
        discount,
        total,
        paymentMethod: method,
        status: "paid",
        demo: true,
        createdAt: new Date().toISOString()
      };

      try {
        const saved = JSON.parse(
          localStorage.getItem("tt_orders") || "[]"
        );

        const orders = Array.isArray(saved) ? saved : [];
        orders.push(order);

        localStorage.setItem(
          "tt_orders",
          JSON.stringify(orders)
        );
      } catch {
        alert("Không thể lưu đơn hàng demo.");
        return;
      }

      completed = true;
      clearInterval(timerInterval);
      sessionStorage.removeItem(deadlineKey);
      sessionStorage.removeItem("tt_payment_draft");

      screen.replaceChildren();

      const successTitle = document.createElement("h2");
      successTitle.textContent = "✓ Thanh toán demo thành công!";
      successTitle.style.color = "#27c477";

      const orderInfo = document.createElement("p");
      orderInfo.textContent = "Mã đơn hàng: " + order.id;

      const successNote = document.createElement("p");
      successNote.textContent =
        "Đây là giao dịch mô phỏng, không có tiền thật được chuyển.";

      const home = document.createElement("a");
      home.href = "index.html";
      home.textContent = "← Về trang chủ";
      home.style.color = "#27c477";

      screen.append(
        successTitle,
        orderInfo,
        successNote,
        home
      );
    });

    screen.append(
      title,
      methodText,
      amount,
      qr,
      note,
      confirm
    );

    result.appendChild(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
