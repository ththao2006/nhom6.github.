
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const LIMIT = 2;

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

  function showError(message) {
    $("eventTitle").textContent = message;
    $("paymentApp").classList.add("hidden");
    $("resultScreen").classList.add("hidden");
  }

  function paymentError(message) {
    $("paymentMessage").textContent = message;
    $("paymentMessage").className = "message error";
  }

  function normalizeId(value) {
    return String(value ?? "");
  }

  // 1. Xác minh tài khoản
  const auth = window.TT_AUTH;

  if (!auth || typeof auth.getCurrentUser !== "function") {
    showError("Không tải được hệ thống tài khoản.");
    return;
  }

  const currentUser = auth.getCurrentUser();

  if (
    !currentUser ||
    !currentUser.verified ||
    !currentUser.verifiedIdentityId
  ) {
    showError(
      "Bạn cần đăng nhập và xác minh danh tính trước khi thanh toán."
    );

    const link = document.createElement("a");
    link.href = "auth.html";
    link.textContent = "→ Đăng nhập / Xác minh eKYC";
    link.style.color = "#27c477";

    $("resultScreen").classList.remove("hidden");
    $("resultScreen").appendChild(link);
    return;
  }

  const identityId = currentUser.verifiedIdentityId;

  function activeIdentityIsValid() {
    const user = auth.getCurrentUser();

    return Boolean(
      user &&
      user.verified &&
      user.id === currentUser.id &&
      user.verifiedIdentityId === identityId
    );
  }

  // 2. Đọc thông tin sự kiện
  const params = new URLSearchParams(location.search);
  const eventId = params.get("id");
  const resaleId = params.get("resale");
  const isResale = Boolean(resaleId);

  const eventMap = new Map();

  const seed = Array.isArray(window.TT_SEED_EVENTS)
    ? window.TT_SEED_EVENTS
    : [];

  seed.forEach(event => {
    if (event && event.id != null) {
      eventMap.set(normalizeId(event.id), event);
    }
  });

  readArray("tt_events").forEach(event => {
    if (event && event.id != null) {
      eventMap.set(normalizeId(event.id), event);
    }
  });

  const event = eventMap.get(normalizeId(eventId));

  if (!event) {
    showError("Không tìm thấy sự kiện.");
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
    showError("Sự kiện này hiện không cho phép mua vé.");
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
    showError("Sự kiện đã kết thúc.");
    return;
  }

  $("eventTitle").textContent = event.title;
  $("eventDate").textContent =
    "📅 " + (event.date || "") +
    " · " + (event.time || "");

  $("eventVenue").textContent =
    "📍 " + (event.venue || "") +
    " · " + (event.location || "");

  document.title = "Thanh toán | " + event.title;

  $("backLink").href = isResale
    ? "resale.html"
    : "checkout.html?id=" + encodeURIComponent(event.id);

  // 3. Đọc bản nháp
  let draft = null;

  try {
    draft = JSON.parse(
      sessionStorage.getItem("tt_payment_draft")
    );
  } catch {
    draft = null;
  }

  // 4. Đọc tin bán lại
  function getOriginalPrice(ticketId, fallback) {
    const ticket = (event.ticketTypes || []).find(
      item => normalizeId(item.id) === normalizeId(ticketId)
    );

    const original = Number(ticket?.price);

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
      normalizeId(item.id) === normalizeId(resaleId) &&
      normalizeId(item.eventId) === normalizeId(event.id) &&
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
    const maxPrice = Math.floor(original * 1.1);

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
      showError("Vé bán lại không còn hợp lệ.");
      return;
    }

    const badge = document.createElement("span");
    badge.textContent = " • VÉ BÁN LẠI";
    badge.style.color = "#27c477";
    badge.style.fontWeight = "bold";
    badge.style.fontSize = "13px";

    $("eventTitle").appendChild(badge);
  }

  // Vé gốc bắt buộc có draft hợp lệ từ checkout.
  // Vé bán lại tương thích với luồng cũ chưa tạo draft.
  const validDraft = Boolean(
    draft &&
    normalizeId(draft.eventId) === normalizeId(event.id) &&
    Array.isArray(draft.items) &&
    draft.items.length > 0 &&
    (
      isResale
        ? draft.type === "resale" &&
          normalizeId(draft.resaleId) === normalizeId(resaleId)
        : draft.type !== "resale"
    )
  );

  if (!isResale && !validDraft) {
    showError(
      "Không có đơn đặt vé hợp lệ. Vui lòng chọn vé lại."
    );
    return;
  }

  // Nếu draft đã gắn tài khoản, phải khớp phiên hiện tại.
  if (
    validDraft &&
    (
      draft.buyer?.userId &&
      draft.buyer.userId !== currentUser.id
    )
  ) {
    showError(
      "Đơn đặt vé thuộc tài khoản khác. Vui lòng chọn lại."
    );
    return;
  }

  if (
    validDraft &&
    draft.buyer?.verifiedIdentityId &&
    draft.buyer.verifiedIdentityId !== identityId
  ) {
    showError(
      "Danh tính của đơn đặt vé không khớp tài khoản."
    );
    return;
  }

  // Checkout mới bắt buộc gắn userId + identityId.
  if (
    !isResale &&
    (
      draft.buyer?.userId !== currentUser.id ||
      draft.buyer?.verifiedIdentityId !== identityId
    )
  ) {
    showError(
      "Đơn đặt vé chưa được xác minh. Vui lòng chọn vé lại."
    );
    return;
  }

  // Với vé bán lại, luôn lấy giá từ tin đăng.
  const items = isResale
    ? [{
        ticketTypeId: resaleListing.ticketId,
        name: resaleListing.ticketName || "Vé bán lại",
        price: Number(resaleListing.resalePrice),
        originalPrice: getOriginalPrice(
          resaleListing.ticketId,
          resaleListing.originalPrice
        ),
        quantity: 1
      }]
    : draft.items.map(item => ({
        ticketTypeId: item.ticketTypeId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity)
      }));

  // 5. Kiểm tra loại vé, số lượng, giá
  function validateItems() {
    if (!items.length) return false;

    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.price);

      if (
        !Number.isSafeInteger(qty) ||
        qty < 1 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return false;
      }

      const ticket = (event.ticketTypes || []).find(
        type =>
          normalizeId(type.id) ===
          normalizeId(item.ticketTypeId)
      );

      if (!ticket) return false;

      if (!isResale) {
        if (
          price !== Number(ticket.price) ||
          qty > Number(ticket.quantity)
        ) {
          return false;
        }
      } else if (qty !== 1) {
        return false;
      }
    }

    return true;
  }

  if (!validateItems()) {
    showError("Thông tin loại vé hoặc giá vé không hợp lệ.");
    return;
  }

  const quantity = items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0
  );

  if (quantity < 1 || quantity > LIMIT) {
    showError("Mỗi danh tính chỉ được mua tối đa 2 vé.");
    return;
  }

  // 6. Đếm tổng vé đã mua theo danh tính
  function countPurchased() {
    return readArray("tt_orders")
      .filter(order =>
        normalizeId(order.eventId) === normalizeId(event.id) &&
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

  function checkPurchaseLimit() {
    const purchased = countPurchased();

    return {
      purchased,
      remaining: Math.max(0, LIMIT - purchased),
      allowed: purchased + quantity <= LIMIT
    };
  }

  if (!checkPurchaseLimit().allowed) {
    showError(
      "Bạn đã vượt hạn mức 2 vé / danh tính / sự kiện."
    );
    return;
  }

  // 7. Thông tin người nhận vé
  const buyer = {
    name: currentUser.name,
    email: currentUser.email,
    phone: validDraft ? (draft.buyer?.phone || "") : "",
    userId: currentUser.id,
    verifiedIdentityId: identityId
  };

  $("receiverEmail").value = currentUser.email;
  $("receiverEmail").readOnly = true;

  const receiverNote = document.createElement("p");
  receiverNote.className = "muted";
  receiverNote.style.fontSize = "13px";
  receiverNote.textContent =
    "✓ Vé gắn với danh tính đã xác minh: " + identityId;

  $("receiverEmail").insertAdjacentElement(
    "afterend",
    receiverNote
  );

  // 8. Tóm tắt thanh toán
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  let discount = 0;
  let completed = false;
  let expired = false;
  let confirmationOpen = false;

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
      completed ||
      confirmationOpen;
  }

  updateTotal();
  updateButton();

  $("agreeTerms").addEventListener(
    "change",
    updateButton
  );

  // 9. Mã khuyến mãi DEMO10
  if (isResale) {
    $("voucherInput").disabled = true;
    $("applyVoucher").disabled = true;

    $("voucherMessage").textContent =
      "Mã giảm giá không áp dụng cho vé bán lại.";
  }

  $("applyVoucher").addEventListener("click", () => {
    if (isResale || expired || completed) return;

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

  // 10. Đồng hồ 15 phút
  // Gắn với giao dịch thay vì chỉ gắn với sự kiện.
  const draftCreatedAt = validDraft
    ? String(draft.createdAt || "")
    : "";

  const transactionKey = isResale
    ? "resale_" + resaleId
    : "original_" + event.id + "_" + draftCreatedAt;

  const deadlineKey =
    "tt_payment_deadline_" + transactionKey;

  let deadline = Number(
    sessionStorage.getItem(deadlineKey)
  );

  if (!Number.isFinite(deadline) || deadline <= 0) {
    deadline = Date.now() + 15 * 60 * 1000;

    sessionStorage.setItem(
      deadlineKey,
      String(deadline)
    );
  }

  let timerInterval = null;

  function updateTimer() {
    if (completed) return;

    const remaining = Math.max(
      0,
      Math.ceil((deadline - Date.now()) / 1000)
    );

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    $("timer").textContent =
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0");

    if (remaining === 0) {
      expired = true;
      clearInterval(timerInterval);
      updateButton();

      if (!confirmationOpen) {
        paymentError(
          "Hết thời gian giữ vé. Hãy chọn lại vé."
        );
      }

      const confirm = $("confirmDemoPayment");
      if (confirm) confirm.disabled = true;
    }
  }

  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  function validateResaleOwnership(listing) {
    if (!isResale) return null;

    if (!window.TT_TICKETS) {
      return "Chưa tải hệ thống quản lý vé.";
    }

    if (!listing?.unitKey) {
      return "Tin đăng cũ chưa có mã vé riêng. Vui lòng đăng lại vé.";
    }

    const ticket = window.TT_TICKETS.getAll().find(
      item => item.unitKey === listing.unitKey
    );

    if (!ticket) {
      return "Không tìm thấy vé gốc. Vui lòng kiểm tra lại tin đăng.";
    }

    if (ticket.status !== "valid") {
      return "Vé đã sử dụng hoặc không còn hợp lệ.";
    }

    if (
      ticket.ownerUserId !== listing.ownerUserId ||
      ticket.ownerIdentityId !== listing.ownerIdentityId
    ) {
      return "Người đăng bán không còn sở hữu vé.";
    }

    if (
      ticket.ownerUserId === currentUser.id ||
      ticket.ownerIdentityId === identityId
    ) {
      return "Bạn không thể mua lại vé của chính mình.";
    }

    return null;
  }

  // 11. Kiểm tra trước khi thanh toán
  function validateBeforePayment() {
    if (!activeIdentityIsValid()) {
      return "Phiên tài khoản đã thay đổi. Hãy đăng nhập lại.";
    }

    if (!validateItems()) {
      return "Thông tin vé không còn hợp lệ.";
    }

    if (!checkPurchaseLimit().allowed) {
      return (
        "Bạn đã mua đủ hạn mức 2 vé cho sự kiện này."
      );
    }

    if (isResale) {
      const listing = getResaleListing();
      const ownershipError = validateResaleOwnership(listing);
if (ownershipError) return ownershipError;

      if (
        !validResaleListing(listing) ||
        Number(listing.resalePrice) !== subtotal ||
        normalizeId(listing.ticketId) !==
          normalizeId(items[0].ticketTypeId)
      ) {
        return "Tin bán lại đã thay đổi hoặc không còn hợp lệ.";
      }
    }

    return null;
  }

  // 12. Mở màn hình xác nhận thanh toán
  $("payButton").addEventListener("click", () => {
    if (expired || completed || confirmationOpen) return;

    if (!$("agreeTerms").checked) {
      paymentError("Vui lòng đồng ý điều khoản.");
      return;
    }

    const error = validateBeforePayment();

    if (error) {
      paymentError(error);
      return;
    }

    const checkedMethod = document.querySelector(
      'input[name="method"]:checked'
    );

    if (!checkedMethod) {
      paymentError("Vui lòng chọn phương thức thanh toán.");
      return;
    }

    const method = checkedMethod.value;
    const total = subtotal - discount;

    confirmationOpen = true;
    updateButton();

    $("paymentApp").classList.add("hidden");
    $("resultScreen").classList.remove("hidden");

    const result = $("resultScreen");
    result.replaceChildren();

    const screen = document.createElement("div");
    screen.className = "qr-screen";

    const title = document.createElement("h2");
    title.textContent = "Xác nhận thanh toán demo";

    const methodNames = {
      vnpay: "VNPAY",
      vietqr: "VietQR",
      shopeepay: "ShopeePay",
      zalopay: "ZaloPay",
      card: "Thẻ ngân hàng"
    };

    const methodText = document.createElement("p");
    methodText.textContent =
      "Phương thức: " +
      (methodNames[method] || method);

    const amount = document.createElement("h2");
    amount.textContent = money(total);
    amount.style.color = "#27c477";

    const qr = document.createElement("div");
    qr.className = "qr-visual";

    // QR minh họa, không chứa thông tin chuyển khoản.
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

    const note = document.createElement("p");
    note.textContent =
      "Mã QR chỉ để minh họa. Không chuyển tiền thật.";

    const confirmButton = document.createElement("button");
    confirmButton.id = "confirmDemoPayment";
    confirmButton.className = "pay-button";
    confirmButton.textContent =
      "Xác nhận đã thanh toán (DEMO)";

    const confirmMessage = document.createElement("p");
    confirmMessage.className = "message";

    function showConfirmError(message) {
      confirmMessage.textContent = message;
      confirmMessage.className = "message error";
    }

    // 13. Xác nhận và lưu đơn hàng
    confirmButton.addEventListener("click", () => {
      if (completed || expired) return;

      const error = validateBeforePayment();

      if (error) {
        showConfirmError(error);
        return;
      }

      // Đảm bảo bản nháp vé gốc vẫn còn và đúng tài khoản.
      if (!isResale) {
        let latestDraft = null;

        try {
          latestDraft = JSON.parse(
            sessionStorage.getItem("tt_payment_draft")
          );
        } catch {
          latestDraft = null;
        }

        if (
          !latestDraft ||
          latestDraft.createdAt !== draft.createdAt ||
          latestDraft.buyer?.userId !== currentUser.id ||
          latestDraft.buyer?.verifiedIdentityId !== identityId
        ) {
          showConfirmError(
            "Đơn đặt vé đã thay đổi. Vui lòng chọn vé lại."
          );
          return;
        }
      }

      // Kiểm tra lần cuối tin bán lại
      let listings = [];
      let currentListing = null;

      if (isResale) {
        listings = readArray("tt_resales");

        currentListing = listings.find(item =>
          normalizeId(item.id) === normalizeId(resaleId) &&
          normalizeId(item.eventId) === normalizeId(event.id) &&
          item.status === "active"
        );

        if (
          !validResaleListing(currentListing) ||
          Number(currentListing.resalePrice) !== subtotal ||
          normalizeId(currentListing.ticketId) !==
            normalizeId(items[0].ticketTypeId)
        ) {
          showConfirmError(
            "Vé đã được bán hoặc giá đã thay đổi."
          );
          return;
        }
      }

      const order = {
        id: "ORD-" + Date.now() + "-" +
          Math.random().toString(36).slice(2, 7),

        type: isResale ? "resale" : "original",
        resaleId: isResale ? resaleId : null,

        eventId: event.id,
        eventTitle: event.title,

        buyer: {
          ...buyer,
          name: currentUser.name,
          email: currentUser.email,
          userId: currentUser.id,
          verifiedIdentityId: identityId
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
        const ticketCore = window.TT_TICKETS;

        if (!ticketCore) {
          throw new Error("Chưa tải ticket-core.js");
        }

        const oldOrdersRaw =
          localStorage.getItem("tt_orders");

        const oldListingsRaw =
          localStorage.getItem("tt_resales");

        const oldTicketsRaw =
          localStorage.getItem("tt_ticket_units");

        const orders = readArray("tt_orders");

        if (orders.some(item => item.id === order.id)) {
          throw new Error("Đơn hàng đã tồn tại.");
        }

        if (isResale) {
          const ownershipError =
            validateResaleOwnership(currentListing);

          if (ownershipError) {
            throw new Error(ownershipError);
          }

          // Chuẩn bị trạng thái tin đăng đã bán.
          const updatedListings = listings.map(item => {
            if (normalizeId(item.id) !== normalizeId(resaleId)) {
              return item;
            }

            return {
              ...item,
              status: "sold",
              soldAt: new Date().toISOString(),
              buyerOrderId: order.id,
              buyerUserId: currentUser.id,
              buyerIdentityId: identityId
            };
          });

          // Chuyển quyền sở hữu và thay mã QR.
          const transferResult = ticketCore.transfer(
            currentListing,
            {
              userId: currentUser.id,
              verifiedIdentityId: identityId
            },
            order.id
          );

          if (!transferResult.ok) {
            throw new Error(transferResult.message);
          }

          try {
            localStorage.setItem(
              "tt_resales",
              JSON.stringify(updatedListings)
            );

            orders.push(order);

            localStorage.setItem(
              "tt_orders",
              JSON.stringify(orders)
            );
          } catch (saveError) {
            // Khôi phục dữ liệu nếu một bước lưu bị lỗi.
            try {
              if (oldTicketsRaw === null) {
                localStorage.removeItem("tt_ticket_units");
              } else {
                localStorage.setItem(
                  "tt_ticket_units",
                  oldTicketsRaw
                );
              }

              if (oldListingsRaw === null) {
                localStorage.removeItem("tt_resales");
              } else {
                localStorage.setItem(
                  "tt_resales",
                  oldListingsRaw
                );
              }

              if (oldOrdersRaw === null) {
                localStorage.removeItem("tt_orders");
              } else {
                localStorage.setItem(
                  "tt_orders",
                  oldOrdersRaw
                );
              }
            } catch (rollbackError) {
              console.error(
                "Không thể khôi phục dữ liệu:",
                rollbackError
              );
            }

            throw saveError;
          }

        } else {
          // Mua vé gốc.
          // Tạo từng chiếc vé riêng biệt.
          ticketCore.createFromOrder(order);

          try {
            orders.push(order);

            localStorage.setItem(
              "tt_orders",
              JSON.stringify(orders)
            );
          } catch (saveError) {
            try {
              if (oldTicketsRaw === null) {
                localStorage.removeItem("tt_ticket_units");
              } else {
                localStorage.setItem(
                  "tt_ticket_units",
                  oldTicketsRaw
                );
              }
            } catch (rollbackError) {
              console.error(rollbackError);
            }

            throw saveError;
          }
        }

      } catch (error) {
        showConfirmError(
          error.message ||
          "Không thể lưu giao dịch demo."
        );
        return;
      }

      completed = true;
      clearInterval(timerInterval);

      sessionStorage.removeItem(deadlineKey);

      if (
        !isResale ||
        (
          validDraft &&
          draft.type === "resale" &&
          normalizeId(draft.resaleId) === normalizeId(resaleId)
        )
      ) {
        sessionStorage.removeItem("tt_payment_draft");
      }

      screen.replaceChildren();

      const successTitle = document.createElement("h2");
      successTitle.textContent =
        "✓ Thanh toán demo thành công!";
      successTitle.style.color = "#27c477";

      const orderInfo = document.createElement("p");
      orderInfo.textContent = "Mã đơn hàng: " + order.id;

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
      confirmButton,
      confirmMessage
    );

    result.appendChild(screen);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
})();
