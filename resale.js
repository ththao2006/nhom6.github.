
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const form = $("resaleForm");
  const select = $("ownedTicket");
  const priceInput = $("resalePrice");
  const priceInfo = $("priceInfo");
  const priceError = $("priceError");
  const submitBtn = form?.querySelector('button[type="submit"]');
  const list = $("resaleList");
  const grid = $("resaleEventGrid");

  if (!form || !select || !priceInput || !list) return;

  const auth = window.TT_AUTH;
  const money = n =>
    new Intl.NumberFormat("vi-VN").format(Number(n) || 0) + " đ";

  const normalize = value => String(value ?? "");

  let selectedEventId = "";
  let availableTickets = [];

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  const getOrders = () => readArray("tt_orders");
  const getListings = () => readArray("tt_resales");

  function currentUser() {
    return auth?.getCurrentUser?.() || null;
  }

  function verifiedUser() {
    const user = currentUser();
    return user?.verified && user?.verifiedIdentityId
      ? user
      : null;
  }

  function ownerOf(order) {
    return order.buyer?.userId || null;
  }

  function getEvents() {
    const map = new Map();

    (window.TT_SEED_EVENTS || []).forEach(event => {
      map.set(normalize(event.id), event);
    });

    readArray("tt_events").forEach(event => {
      map.set(normalize(event.id), event);
    });

    return [...map.values()];
  }

  function getOriginalPrice(eventId, ticketId, fallback) {
    const event = getEvents().find(
      item => normalize(item.id) === normalize(eventId)
    );

    const type = (event?.ticketTypes || []).find(
      item => normalize(item.id) === normalize(ticketId)
    );

    const officialPrice = Number(type?.price);

    if (Number.isFinite(officialPrice) && officialPrice > 0) {
      return officialPrice;
    }

    const backup = Number(fallback);

    return Number.isFinite(backup) && backup > 0
      ? backup
      : 0;
  }

  // Mỗi vé được nhận diện bằng:
  // mã đơn + vị trí loại vé + vị trí vé trong loại đó.
  function unitKey(orderId, itemIndex, unitIndex) {
    return [
      normalize(orderId),
      itemIndex,
      unitIndex
    ].join("::");
  }

  function makeUnits(order) {
    const result = [];

    (order.items || []).forEach((item, itemIndex) => {
      const quantity = Number(item.quantity) || 0;
      const ticketId = item.ticketTypeId || item.id;

      if (!ticketId) return;

      for (let unitIndex = 0; unitIndex < quantity; unitIndex++) {
        result.push({
          unitKey: unitKey(order.id, itemIndex, unitIndex),
          orderId: order.id,
          eventId: order.eventId,
          eventTitle: order.eventTitle,
          ticketId,
          ticketName: item.name,
          originalPrice: getOriginalPrice(
            order.eventId,
            ticketId,
            item.originalPrice || item.price
          ),
          ownerUserId: ownerOf(order),
          ownerIdentityId:
            order.buyer?.verifiedIdentityId || null
        });
      }
    });

    return result;
  }

  function getAvailableTickets() {
    const user = verifiedUser();
    if (!user) return [];

    const listings = getListings();
    const result = [];

    getOrders().forEach(order => {
      if (order.status !== "paid") return;

      // Không được lấy vé của người khác.
      if (ownerOf(order) !== user.id) return;

      // Kiểm tra danh tính gắn với đơn hàng.
      if (
        order.buyer?.verifiedIdentityId !==
        user.verifiedIdentityId
      ) return;

      const units = makeUnits(order);

      units.forEach(unit => {
        // Tin đăng mới sử dụng unitKey.
        const alreadyListed = listings.some(item =>
          item.unitKey === unit.unitKey &&
          ["active", "sold"].includes(item.status)
        );

        if (alreadyListed) return;

        // Tương thích với tin đăng cũ chưa có unitKey:
        // dành trước số vé tương ứng để tránh đăng trùng.
        const sameTypeUnits = units.filter(item =>
          normalize(item.ticketId) ===
          normalize(unit.ticketId)
        );

        const position = sameTypeUnits.findIndex(
          item => item.unitKey === unit.unitKey
        );

        const legacyCount = listings.filter(item =>
          !item.unitKey &&
          normalize(item.orderId) === normalize(order.id) &&
          normalize(item.ticketId) ===
            normalize(unit.ticketId) &&
          ["active", "sold"].includes(item.status)
        ).length;

        if (position < legacyCount) return;

        // Không bán lại vé của sự kiện đã kết thúc.
        const event = getEvents().find(
          item =>
            normalize(item.id) === normalize(unit.eventId)
        );

        if (!event) return;

        const eventDate = String(event.date || "");

        if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
          if (new Date(eventDate + "T23:59:59") < new Date()) {
            return;
          }
        }

        if (unit.originalPrice <= 0) return;

        result.push(unit);
      });
    });

    return result;
  }

  function showFormNotice(message, isError = false) {
    let notice = form.querySelector(".resale-success");

    if (!notice) {
      notice = document.createElement("div");
      notice.className = "notice resale-success";
      form.appendChild(notice);
    }

    notice.style.background = isError
      ? "#451d25"
      : "#164b31";

    notice.style.color = isError
      ? "#ff9393"
      : "#b8ff35";

    notice.textContent = message;
  }

  function renderOwnedTickets() {
    availableTickets = getAvailableTickets();

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn vé --";
    select.appendChild(placeholder);

    availableTickets.forEach(ticket => {
      const option = document.createElement("option");

      option.value = ticket.unitKey;
      option.textContent =
        ticket.eventTitle + " — " +
        ticket.ticketName + " — " +
        money(ticket.originalPrice) +
        " — #" + ticket.unitKey.split("::").slice(-2).join("-");

      select.appendChild(option);
    });

    select.disabled = availableTickets.length === 0;

    const user = verifiedUser();

    if (!user) {
      showFormNotice(
        "🔒 Đăng nhập và hoàn thành eKYC để đăng bán vé. " +
        "Truy cập trang Đăng nhập / Đăng ký.",
        true
      );

      const link = document.createElement("a");
      link.href =
        "auth.html?return=" +
        encodeURIComponent("resale.html");
      link.textContent = " → Đi đến eKYC";
      link.style.color = "#b8ff35";

      form.querySelector(".resale-success")?.appendChild(link);
    } else if (!availableTickets.length) {
      showFormNotice(
        "Bạn chưa có vé hợp lệ để đăng bán. " +
        "Hãy mua vé bằng tài khoản eKYC này trước."
      );
    } else {
      form.querySelector(".resale-success")?.remove();
    }

    validateResalePrice();
  }

  function getSelectedTicket() {
    return availableTickets.find(
      item => item.unitKey === select.value
    ) || null;
  }

  function validateResalePrice() {
    const ticket = getSelectedTicket();
    const price = Number(priceInput.value);

    priceInput.classList.remove(
      "price-invalid",
      "price-valid"
    );

    if (priceError) {
      priceError.textContent = "";
      priceError.classList.remove("show");
    }

    if (!verifiedUser() || !ticket) {
      priceInfo.textContent =
        "Chọn vé để xem giá bán lại tối đa.";
      submitBtn.disabled = true;
      return false;
    }

    const original = Number(ticket.originalPrice);
    const maximum = Math.floor(original * 1.1);

    priceInfo.textContent =
      "Giá gốc: " + money(original) +
      " · Tối đa 110%: " + money(maximum);

    const valid =
      priceInput.value.trim() !== "" &&
      Number.isSafeInteger(price) &&
      price >= 1000 &&
      price <= maximum;

    if (!valid && priceInput.value.trim()) {
      priceInput.classList.add("price-invalid");

      if (priceError) {
        priceError.textContent =
          price > maximum
            ? "⚠ Giá vượt mức cho phép: " + money(maximum)
            : "⚠ Giá bán phải từ 1.000đ và không vượt trần.";

        priceError.classList.add("show");
      }
    }

    if (valid) {
      priceInput.classList.add("price-valid");
    }

    submitBtn.disabled = !valid;
    return valid;
  }

  function getActiveListings() {
    return getListings()
      .filter(item => item.status === "active")
      .filter(item =>
        !selectedEventId ||
        normalize(item.eventId) === selectedEventId
      )
      .reverse();
  }

  function renderListings() {
    list.replaceChildren();

    const listings = getActiveListings();
    const user = verifiedUser();

    if (!listings.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent =
        "Chưa có vé nào được đăng bán cho sự kiện này.";
      list.appendChild(empty);
      return;
    }

    listings.forEach(item => {
      const card = document.createElement("div");
      card.className = "listing";

      const title = document.createElement("h3");
      title.textContent = item.eventTitle || "Sự kiện";

      const type = document.createElement("p");
      type.className = "muted";
      type.textContent = "Loại vé: " + item.ticketName;

      const original = getOriginalPrice(
        item.eventId,
        item.ticketId,
        item.originalPrice
      );

      const originalText = document.createElement("p");
      originalText.className = "muted";
      originalText.textContent =
        "Giá gốc: " + money(original);

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = money(item.resalePrice);

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "Vé chuyển nhượng chính thức (DEMO)";

      const buy = document.createElement("button");
      buy.type = "button";
      buy.className = "btn";

      const ownListing = Boolean(
        user &&
        (
          item.ownerUserId === user.id ||
          (
            !item.ownerUserId &&
            getOrders().some(order =>
              normalize(order.id) === normalize(item.orderId) &&
              order.buyer?.userId === user.id
            )
          )
        )
      );

      buy.textContent = ownListing
        ? "Vé do bạn đăng bán"
        : "Mua lại (DEMO)";

      buy.disabled = ownListing;

      buy.addEventListener("click", () => {
        const activeUser = verifiedUser();

        if (!activeUser) {
          location.href =
            "auth.html?return=" +
            encodeURIComponent("resale.html");
          return;
        }

        const target = getListings().find(
          x => normalize(x.id) === normalize(item.id)
        );

        if (!target || target.status !== "active") {
          alert("Tin đăng không còn hoạt động.");
          renderListings();
          return;
        }

        const sellerOrder = getOrders().find(
          order =>
            normalize(order.id) === normalize(target.orderId)
        );

        if (
          target.ownerUserId === activeUser.id ||
          sellerOrder?.buyer?.userId === activeUser.id
        ) {
          alert("Bạn không thể tự mua vé của mình.");
          return;
        }

        const official = getOriginalPrice(
          target.eventId,
          target.ticketId,
          target.originalPrice
        );

        const resalePrice = Number(target.resalePrice);

        if (
          official <= 0 ||
          !Number.isSafeInteger(resalePrice) ||
          resalePrice < 1000 ||
          resalePrice > Math.floor(official * 1.1)
        ) {
          alert("Giá bán lại không hợp lệ.");
          return;
        }

        const draft = {
          type: "resale",
          resaleId: target.id,
          eventId: target.eventId,
          eventTitle: target.eventTitle,
          buyer: {
            userId: activeUser.id,
            verifiedIdentityId:
              activeUser.verifiedIdentityId,
            name: activeUser.name,
            email: activeUser.email
          },
          items: [{
            ticketTypeId: target.ticketId,
            name: target.ticketName,
            price: resalePrice,
            originalPrice: official,
            quantity: 1
          }],
          total: resalePrice,
          createdAt: new Date().toISOString()
        };

        sessionStorage.setItem(
          "tt_payment_draft",
          JSON.stringify(draft)
        );

        sessionStorage.removeItem(
          "tt_payment_deadline_resale_" + target.id
        );

        location.href =
          "payment.html?id=" +
          encodeURIComponent(target.eventId) +
          "&resale=" +
          encodeURIComponent(target.id);
      });

      card.append(
        title,
        type,
        originalText,
        price,
        tag,
        buy
      );

      list.appendChild(card);
    });
  }

  function renderResaleEvents() {
    if (!grid) return;

    grid.replaceChildren();

    getEvents().filter(event =>
      !["pending", "rejected", "draft", "hidden", "ended"]
        .includes(event.status)
    ).forEach(event => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "resale-event-card";

      const image = document.createElement("img");
      image.src = event.image || "";
      image.alt = event.title || "Sự kiện";

      const title = document.createElement("strong");
      title.textContent = event.title || "Sự kiện";

      const date = document.createElement("small");
      date.textContent = event.date || "";

      card.append(image, title, date);

      card.addEventListener("click", () => {
        selectedEventId =
          selectedEventId === normalize(event.id)
            ? ""
            : normalize(event.id);

        renderListings();

        $("market")?.scrollIntoView({
          behavior: "smooth"
        });
      });

      grid.appendChild(card);
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const user = verifiedUser();

    if (!user) {
      showFormNotice("Bạn cần xác minh eKYC.", true);
      return;
    }

    if (!validateResalePrice()) return;

    // Đọc lại dữ liệu ngay trước khi đăng.
    const ticket = getAvailableTickets().find(
      item => item.unitKey === select.value
    );

    if (!ticket) {
      showFormNotice(
        "Vé này không còn đủ điều kiện đăng bán.",
        true
      );
      renderOwnedTickets();
      return;
    }

    const price = Number(priceInput.value);
    const maximum = Math.floor(ticket.originalPrice * 1.1);

    if (
      !Number.isSafeInteger(price) ||
      price < 1000 ||
      price > maximum
    ) {
      validateResalePrice();
      return;
    }

    const listings = getListings();

    if (listings.some(item =>
      item.unitKey === ticket.unitKey &&
      ["active", "sold"].includes(item.status)
    )) {
      showFormNotice("Vé đã được đăng bán trước đó.", true);
      renderOwnedTickets();
      return;
    }

    listings.push({
      id: "RES-" +
        Date.now() + "-" +
        Math.random().toString(36).slice(2, 8),
      ...ticket,
      ownerUserId: user.id,
      ownerIdentityId: user.verifiedIdentityId,
      resalePrice: price,
      status: "active",
      createdAt: new Date().toISOString()
    });

    try {
      localStorage.setItem(
        "tt_resales",
        JSON.stringify(listings)
      );
    } catch {
      showFormNotice("Không lưu được tin đăng.", true);
      return;
    }

    form.reset();
    renderOwnedTickets();
    renderListings();

    showFormNotice("✓ Đăng bán vé thành công (DEMO)!");
  });

  select.addEventListener("change", validateResalePrice);
  priceInput.addEventListener("input", validateResalePrice);

  window.addEventListener("focus", () => {
    renderOwnedTickets();
    renderListings();
  });

  renderResaleEvents();
  renderOwnedTickets();
  renderListings();
})();
