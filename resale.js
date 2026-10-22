
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const form = $("resaleForm");
  const select = $("ownedTicket");
  const priceInput = $("resalePrice");
  const priceInfo = $("priceInfo");
  const priceError = $("priceError");
  const list = $("resaleList");
  const grid = $("resaleEventGrid");
  const market = $("market");

  if (!form || !select || !priceInput || !list) return;

  const submitBtn = form.querySelector(
    'button[type="submit"]'
  );

  const auth = window.TT_AUTH;
  const ticketCore = window.TT_TICKETS;

  const money = value =>
    new Intl.NumberFormat("vi-VN").format(
      Number(value) || 0
    ) + " đ";

  const normalize = value => String(value ?? "");

  let selectedEventId = "";
  let availableTickets = [];

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

  function getOrders() {
    return readArray("tt_orders");
  }

  function getListings() {
    return readArray("tt_resales");
  }

  function currentUser() {
    return auth?.getCurrentUser?.() || null;
  }

  function verifiedUser() {
    const user = currentUser();

    return user?.verified && user?.verifiedIdentityId
      ? user
      : null;
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

  function getOriginalPrice(eventId, ticketId, fallback) {
    const event = findEvent(eventId);

    const type = (event?.ticketTypes || []).find(
      item => normalize(item.id) === normalize(ticketId)
    );

    const official = Number(type?.price);

    if (Number.isFinite(official) && official > 0) {
      return official;
    }

    const backup = Number(fallback);

    return Number.isFinite(backup) && backup > 0
      ? backup
      : 0;
  }

  function eventCanResell(event) {
    if (!event) return false;

    if (
      ["pending", "rejected", "draft", "hidden", "ended"]
        .includes(event.status)
    ) {
      return false;
    }

    const date = String(event.date || "");

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const end = new Date(date + "T23:59:59");

      if (
        !Number.isNaN(end.getTime()) &&
        end < new Date()
      ) {
        return false;
      }
    }

    return true;
  }

  // Đồng bộ đơn mua gốc cũ vào kho từng chiếc vé.
  // Không tạo vé từ đơn resale vì đó là vé được chuyển,
  // không phải một chiếc vé mới.
  function syncOldOriginalOrders() {
    if (!ticketCore?.createFromOrder) return;

    const listings = getListings();

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

      // Nếu đơn cũ có tin bán lại đã bán nhưng chưa
      // được chuyển quyền sở hữu trong kho vé,
      // không tự cấp lại để tránh sai chủ.
      const hasLegacySold = listings.some(item =>
        normalize(item.orderId) === normalize(order.id) &&
        item.status === "sold" &&
        !item.unitKey
      );

      if (hasLegacySold) return;

      ticketCore.createFromOrder(order);
    });
  }

  function getUnits() {
    return ticketCore?.getAll?.() || [];
  }

  function getAvailableTickets() {
    const user = verifiedUser();

    if (!user || !ticketCore) return [];

    const listings = getListings();

    return getUnits()
      .filter(unit =>
        unit.ownerUserId === user.id &&
        unit.ownerIdentityId === user.verifiedIdentityId &&
        unit.status === "valid"
      )
      .filter(unit => {
        const event = findEvent(unit.eventId);
        return eventCanResell(event);
      })
      .filter(unit => {
        const activeListing = listings.some(item =>
          item.unitKey === unit.unitKey &&
          item.status === "active"
        );

        if (activeListing) return false;

        // Chặn vé thuộc đơn có tin đăng cũ
        // chưa có unitKey để tránh đăng trùng.
        const legacyListings = listings.filter(item =>
          !item.unitKey &&
          normalize(item.orderId) ===
            normalize(unit.orderId) &&
          normalize(item.ticketId) ===
            normalize(unit.ticketTypeId) &&
          ["active", "sold"].includes(item.status)
        );

        if (!legacyListings.length) return true;

        const sameTypeUnits = getUnits()
          .filter(item =>
            normalize(item.orderId) ===
              normalize(unit.orderId) &&
            normalize(item.ticketTypeId) ===
              normalize(unit.ticketTypeId)
          )
          .sort((a, b) =>
            a.unitKey.localeCompare(b.unitKey)
          );

        const position = sameTypeUnits.findIndex(
          item => item.unitKey === unit.unitKey
        );

        return position >= legacyListings.length;
      })
      .map(unit => ({
        unitKey: unit.unitKey,
        orderId: unit.orderId,
        eventId: unit.eventId,
        eventTitle:
          findEvent(unit.eventId)?.title ||
          unit.eventTitle ||
          "Sự kiện",
        ticketId: unit.ticketTypeId,
        ticketName: unit.ticketName || "Vé",
        originalPrice: getOriginalPrice(
          unit.eventId,
          unit.ticketTypeId,
          unit.originalPrice
        ),
        ownerUserId: unit.ownerUserId,
        ownerIdentityId: unit.ownerIdentityId
      }))
      .filter(unit => unit.originalPrice > 0);
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

  function getSelectedTicket() {
    return availableTickets.find(
      item => item.unitKey === select.value
    ) || null;
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
        money(ticket.originalPrice) + " — #" +
        ticket.unitKey.split("::").slice(-2).join("-");

      select.appendChild(option);
    });

    select.disabled = availableTickets.length === 0;

    const user = verifiedUser();

    if (!ticketCore) {
      showFormNotice(
        "Không tải được ticket-core.js.",
        true
      );
    } else if (!user) {
      showFormNotice(
        "🔒 Bạn cần đăng nhập và xác minh eKYC.",
        true
      );

      const link = document.createElement("a");

      link.href =
        "auth.html?return=" +
        encodeURIComponent("resale.html");

      link.textContent = " → Đi đến eKYC";
      link.style.color = "#b8ff35";

      form.querySelector(".resale-success")
        ?.appendChild(link);

    } else if (!availableTickets.length) {
      showFormNotice(
        "Bạn chưa có vé hợp lệ để đăng bán."
      );
    } else {
      form.querySelector(".resale-success")?.remove();
    }

    validateResalePrice();
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
      if (priceInfo) {
        priceInfo.textContent =
          "Chọn vé để xem giá bán lại tối đa.";
      }

      if (submitBtn) submitBtn.disabled = true;
      return false;
    }

    const original = Number(ticket.originalPrice);
    const maximum = Math.floor(original * 1.1);

    if (priceInfo) {
      priceInfo.textContent =
        "Giá gốc: " + money(original) +
        " · Tối đa 110%: " + money(maximum);
    }

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
            ? "⚠ Giá vượt trần: " + money(maximum)
            : "⚠ Giá phải từ 1.000đ và không vượt trần.";

        priceError.classList.add("show");
      }
    }

    if (valid) {
      priceInput.classList.add("price-valid");
    }

    if (submitBtn) submitBtn.disabled = !valid;

    return valid;
  }

  function getActiveListings() {
    const units = getUnits();

    return getListings()
      .filter(item => item.status === "active")
      .filter(item =>
        !selectedEventId ||
        normalize(item.eventId) === selectedEventId
      )
      .filter(item => {
        if (!item.unitKey) return false;

        const unit = units.find(ticket =>
          ticket.unitKey === item.unitKey
        );

        return Boolean(
          unit &&
          unit.status === "valid" &&
          unit.ownerUserId === item.ownerUserId &&
          unit.ownerIdentityId === item.ownerIdentityId &&
          eventCanResell(findEvent(item.eventId))
        );
      })
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
        "Chưa có vé bán lại hợp lệ cho sự kiện này.";

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
      type.textContent =
        "Loại vé: " + (item.ticketName || "Vé");

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
      tag.textContent =
        "Vé chuyển nhượng chính thức (DEMO)";

      const buy = document.createElement("button");
      buy.type = "button";
      buy.className = "btn";

      const ownListing = Boolean(
        user &&
        (
          item.ownerUserId === user.id ||
          item.ownerIdentityId === user.verifiedIdentityId
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

        const unit = getUnits().find(
          x => x.unitKey === target.unitKey
        );

        if (
          !unit ||
          unit.status !== "valid" ||
          unit.ownerUserId !== target.ownerUserId ||
          unit.ownerIdentityId !== target.ownerIdentityId
        ) {
          alert("Vé không còn hợp lệ.");
          renderListings();
          return;
        }

        if (
          unit.ownerUserId === activeUser.id ||
          unit.ownerIdentityId ===
            activeUser.verifiedIdentityId
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

    getEvents()
      .filter(eventCanResell)
      .forEach(event => {
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

          market?.scrollIntoView({
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
      showFormNotice(
        "Bạn cần xác minh eKYC trước khi đăng bán.",
        true
      );
      return;
    }

    if (!validateResalePrice()) return;

    const ticket = getAvailableTickets().find(
      item => item.unitKey === select.value
    );

    if (!ticket) {
      showFormNotice(
        "Vé không còn đủ điều kiện đăng bán.",
        true
      );
      renderOwnedTickets();
      return;
    }

    const price = Number(priceInput.value);
    const maximum = Math.floor(
      ticket.originalPrice * 1.1
    );

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
      item.status === "active"
    )) {
      showFormNotice(
        "Vé đã có tin đăng bán.",
        true
      );
      renderOwnedTickets();
      return;
    }

    listings.push({
      id: "RES-" + Date.now() + "-" +
        Math.random().toString(36).slice(2, 8),
      ...ticket,
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
      showFormNotice(
        "Không thể lưu tin đăng.",
        true
      );
      return;
    }

    form.reset();
    renderOwnedTickets();
    renderListings();

    showFormNotice(
      "✓ Đăng bán vé thành công (DEMO)!"
    );
  });

  select.addEventListener(
    "change",
    validateResalePrice
  );

  priceInput.addEventListener(
    "input",
    validateResalePrice
  );

  window.addEventListener("focus", () => {
    syncOldOriginalOrders();
    renderOwnedTickets();
    renderListings();
  });

  syncOldOriginalOrders();
  renderResaleEvents();
  renderOwnedTickets();
  renderListings();
})();
