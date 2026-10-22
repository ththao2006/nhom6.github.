
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

  const params = new URLSearchParams(location.search);
  const eventId = params.get("id") || "ev001";
  const resaleId = params.get("resale");

  // Ưu tiên dữ liệu sự kiện mới trong data.js.
  const seed = window.TT_SEED_EVENTS || [];
  const savedEvents = readArray("tt_events");
  const events = [...seed, ...savedEvents];

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

  document.title = "Thanh toán | " + event.title;

  let draft = null;

  try {
    draft = JSON.parse(
      sessionStorage.getItem("tt_payment_draft")
    );
  } catch {}

  const isResale = Boolean(resaleId);

  // Xác định giá gốc do BTC công bố.
  function getOriginalPrice(ticketId, fallback) {
    const type = (event.ticketTypes || [])
      .find(t => t.id === ticketId);

    const original = Number(type?.price);

    if (Number.isFinite(original) && original > 0) {
      return original;
    }

    const backup = Number(fallback);
    return Number.isFinite(backup) && backup > 0
      ? backup
      : 0;
  }

  function getResaleListing() {
    if (!resaleId) return null;

    return readArray("tt_resales").find(item =>
      item.id === resaleId &&
      item.eventId === event.id &&
      item.status === "active"
    ) || null;
  }

  function validResaleListing(item) {
    if (!item) return false;

    const original = getOriginalPrice(
      item.ticketId,
      item.originalPrice
    );

    const price = Number(item.resalePrice);
    const maxPrice = Math.floor(original * 110 / 100);

    return (
      original > 0 &&
      Number.isSafeInteger(price) &&
      price >= 1000 &&
      price <= maxPrice
    );
  }

  let resaleListing = null;

  if (isResale) {
    resaleListing = getResaleListing();

    if (!validResaleListing(resaleListing)) {
      $("paymentApp").classList.add("hidden");
      $("eventTitle").textContent =
        "Vé bán lại không còn hợp lệ";
      return;
    }
  }

  const validDraft = Boolean(
    draft &&
    draft.eventId === event.id &&
    Array.isArray(draft.items) &&
    draft.items.length > 0 &&
    (
      isResale
        ? draft.type === "resale" &&
          draft.resaleId === resaleId
        : draft.type !== "resale"
    )
  );

  // Với vé bán lại, luôn lấy giá từ tin đăng,
  // không tin giá gửi qua URL hoặc sessionStorage.
  const items = isResale
    ? [{
        ticketTypeId: resaleListing.ticketId,
        name: resaleListing.ticketName,
        price: Number(resaleListing.resalePrice),
        originalPrice: getOriginalPrice(
          resaleListing.ticketId,
          resaleListing.originalPrice
        ),
        quantity: 1
      }]
    : validDraft
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

  $("backLink").href = isResale
    ? "resale.html"
    : "checkout.html?id=" +
      encodeURIComponent(event.id);

  if (isResale) {
    // Cho người mua biết đây là giao dịch bán lại.
    const badge = document.createElement("span");
    badge.textContent = " • VÉ BÁN LẠI";
    badge.style.color = "#27c477";
    badge.style.fontWeight = "bold";
    badge.style.fontSize = "13px";
    $("eventTitle").appendChild(badge);
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
    name.textContent =
      item.name + " × " + item.quantity;

    const price = document.createElement("strong");
    price.textContent = money(
      Number(item.price) * Number(item.quantity)
    );

    row.append(name, price);
    $("ticketSummary").appendChild(row);
  });

  function updateTotal() {
    $("subtotal").textContent = money(subtotal);

    $("discount").textContent = discount
      ? "−" + money(discount)
      : "0 đ";

    $("grandTotal").textContent =
      money(subtotal - discount);
  }

  function updateButton() {
    $("payButton").disabled =
      !$("agreeTerms").checked ||
      expired ||
      completed;
  }

  updateTotal();
  updateButton();

  $("agreeTerms").addEventListener(
    "change",
    updateButton
  );

  // Vé bán lại không áp dụng mã giảm giá demo.
  if (isResale) {
    $("voucherInput").disabled = true;
    $("applyVoucher").disabled = true;

    $("voucherMessage").textContent =
      "Mã giảm giá không áp dụng cho vé bán lại.";
    $("voucherMessage").className = "message";
  }

  $("applyVoucher").addEventListener("click", () => {
    if (isResale) return;

    const code = $("voucherInput")
      .value.trim().toUpperCase();

    if (code === "DEMO10") {
      discount = Math.round(subtotal * 0.1);

      $("voucherMessage").textContent =
        "Đã áp dụng giảm giá 10%!";
      $("voucherMessage").className =
        "message success";
    } else {
      discount = 0;

      $("voucherMessage").textContent =
        "Mã không hợp lệ. Thử DEMO10.";
      $("voucherMessage").className =
        "message error";
    }

    updateTotal();
  });

  // Đồng hồ riêng cho từng giao dịch bán lại.
  const deadlineKey = isResale
    ? "tt_payment_deadline_resale_" + resaleId
    : "tt_payment_deadline_" + event.id;

  let deadline = Number(
    sessionStorage.getItem(deadlineKey)
  );

  if (!deadline || !Number.isFinite(deadline)) {
    deadline = Date.now() + 15 * 60 * 1000;

    sessionStorage.setItem(
      deadlineKey,
      String(deadline)
    );
  }

  const timerInterval = setInterval(
    updateTimer,
    1000
  );

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
      $("paymentMessage").className =
        "message error";
    }
  }

  updateTimer();

  $("payButton").addEventListener("click", () => {
    if (expired || completed) return;

    const email = $("receiverEmail")
      .value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $("paymentMessage").textContent =
        "Vui lòng nhập email nhận vé hợp lệ.";
      $("paymentMessage").className =
        "message error";

      $("receiverEmail").focus();
      return;
    }

    const checkedMethod = document.querySelector(
      'input[name="method"]:checked'
    );

    if (!checkedMethod) {
      $("paymentMessage").textContent =
        "Vui lòng chọn phương thức thanh toán.";
      $("paymentMessage").className =
        "message error";
      return;
    }

    const method = checkedMethod.value;
    const total = subtotal - discount;

    $("paymentApp").classList.add("hidden");
    $("resultScreen").classList.remove("hidden");

    const result = $("resultScreen");
    result.replaceChildren();

    const screen = document.createElement("div");
    screen.className = "qr-screen";

    const title = document.createElement("h2");
    title.textContent =
      "Xác nhận thanh toán demo";

    const methodText = document.createElement("p");

    const methodNames = {
      vnpay: "VNPAY",
      vietqr: "VietQR",
      shopeepay: "ShopeePay",
      zalopay: "ZaloPay",
      card: "Thẻ ngân hàng"
    };

    methodText.textContent =
      "Phương thức: " +
      (methodNames[method] || method);

    const amount = document.createElement("h2");
    amount.textContent = money(total);
    amount.style.color = "#27c477";

    const note = document.createElement("p");
    note.textContent =
      "Mã QR minh họa, không dùng để chuyển tiền thật.";

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

    const confirmButton = document.createElement(
      "button"
    );

    confirmButton.className = "pay-button";
    confirmButton.textContent =
      "Xác nhận đã thanh toán (DEMO)";

    confirmButton.addEventListener("click", () => {
      if (completed || expired) return;

      // Kiểm tra lại tin đăng ngay trước khi lưu.
      let currentListing = null;
      let listings = [];

      if (isResale) {
        listings = readArray("tt_resales");

        currentListing = listings.find(x =>
          x.id === resaleId &&
          x.eventId === event.id &&
          x.status === "active"
        );

        if (
          !validResaleListing(currentListing) ||
          Number(currentListing.resalePrice) !== subtotal ||
          currentListing.ticketId !== items[0].ticketTypeId
        ) {
          confirmButton.disabled = true;

          const error = document.createElement("p");
          error.style.color = "#ff6666";
          error.textContent =
            "Vé đã được bán hoặc thông tin giá đã thay đổi. " +
            "Vui lòng quay lại trang bán lại.";

          screen.appendChild(error);
          return;
        }
      }

      const order = {
        id: "ORD-" + Date.now(),
        type: isResale ? "resale" : "original",
        resaleId: isResale ? resaleId : null,
        eventId: event.id,
        eventTitle: event.title,
        buyer: {
          ...buyer,
          email
        },
        items: items.map(item => ({
          id: item.ticketTypeId,
          ticketTypeId: item.ticketTypeId,
          name: item.name,
          price: Number(item.price),
          originalPrice: isResale
            ? getOriginalPrice(
                item.ticketTypeId,
                item.originalPrice
              )
            : Number(item.price),
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
        const orders = readArray("tt_orders");
        orders.push(order);

        localStorage.setItem(
          "tt_orders",
          JSON.stringify(orders)
        );

        if (isResale) {
          currentListing.status = "sold";
          currentListing.soldAt =
            new Date().toISOString();

          currentListing.buyerOrderId = order.id;
          listings = listings.map(x =>
            x.id === resaleId ? currentListing : x
          );

          localStorage.setItem(
            "tt_resales",
            JSON.stringify(listings)
          );
        }
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
      successTitle.textContent =
        "✓ Thanh toán demo thành công!";
      successTitle.style.color = "#27c477";

      const orderInfo = document.createElement("p");
      orderInfo.textContent =
        "Mã đơn hàng: " + order.id;

      const successNote = document.createElement("p");
      successNote.textContent = isResale
        ? "Bạn đã mua lại vé thành công trong chế độ demo."
        : "Bạn đã mua vé thành công trong chế độ demo.";

      const demoNote = document.createElement("p");
      demoNote.textContent =
        "Không có tiền thật được chuyển.";

      const myTickets = document.createElement("a");
      myTickets.href = "my-tickets.html";
      myTickets.textContent = "🎟️ Xem vé của tôi";
      myTickets.style.color = "#27c477";
      myTickets.style.fontWeight = "bold";

      const back = document.createElement("p");
      const backLink = document.createElement("a");
      backLink.href = isResale
        ? "resale.html"
        : "index.html";

      backLink.textContent = isResale
        ? "← Về sàn bán lại vé"
        : "← Về trang chủ";

      backLink.style.color = "#27c477";
      back.appendChild(backLink);

      screen.append(
        successTitle,
        orderInfo,
        successNote,
        demoNote,
        myTickets,
        back
      );
    });

    screen.append(
      title,
      methodText,
      amount,
      qr,
      note,
      confirmButton
    );

    result.appendChild(screen);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
})();
