
(() => {
  const form = document.getElementById("resaleForm");
  const select = document.getElementById("ownedTicket");
  const priceInput = document.getElementById("resalePrice");
  const priceInfo = document.getElementById("priceInfo");
  const priceError = document.getElementById("priceError");
  const submitBtn = form.querySelector('button[type="submit"]');
  const list = document.getElementById("resaleList");

  const money = n =>
    new Intl.NumberFormat("vi-VN").format(n) + " đ";

  function readArray(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  const getOrders = () => readArray("tt_orders");
  const getListings = () => readArray("tt_resales");

  function saveListings(items) {
    localStorage.setItem("tt_resales", JSON.stringify(items));
  }

  // Lấy giá gốc từ dữ liệu BTC.
  // Không lấy giá mua lại làm giá gốc.
  function getOriginalPrice(eventId, ticketId, fallback) {
    const seed = window.TT_SEED_EVENTS || [];
    const saved = readArray("tt_events");

    const events = [...seed, ...saved];
    const event = events.find(e => e.id === eventId);
    const ticket = (event?.ticketTypes || [])
      .find(t => t.id === ticketId);

    const price = Number(ticket?.price);

    if (Number.isFinite(price) && price > 0) {
      return price;
    }

    const backup = Number(fallback);
    return Number.isFinite(backup) && backup > 0
      ? backup
      : 0;
  }

  // Vé còn thuộc quyền sở hữu và chưa đăng bán.
  function getAvailableTickets() {
    const orders = getOrders();
    const listings = getListings();
    const available = [];

    orders.forEach(order => {
      if (order.status !== "paid") return;

      (order.items || []).forEach(item => {
        const ticketId = item.ticketTypeId || item.id;
        if (!ticketId) return;

        const quantity = Number(item.quantity) || 0;

        // Vé đã bán đi không còn thuộc người bán.
        const soldCount = listings.filter(x =>
          x.orderId === order.id &&
          x.ticketId === ticketId &&
          x.status === "sold"
        ).length;

        // Vé đang đăng bán cũng không được đăng trùng.
        const activeCount = listings.filter(x =>
          x.orderId === order.id &&
          x.ticketId === ticketId &&
          x.status === "active"
        ).length;

        const remaining = Math.max(
          0,
          quantity - soldCount - activeCount
        );

        const originalPrice = getOriginalPrice(
          order.eventId,
          ticketId,
          item.originalPrice || item.price
        );

        for (let i = 0; i < remaining; i++) {
          available.push({
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: order.eventTitle,
            ticketId,
            ticketName: item.name,
            originalPrice
          });
        }
      });
    });

    return available;
  }

  function getSelectedTicket() {
    if (select.value === "") return null;

    const index = Number(select.value);
    if (!Number.isInteger(index)) return null;

    return getAvailableTickets()[index] || null;
  }

  function validateResalePrice() {
    const ticket = getSelectedTicket();
    const price = Number(priceInput.value);

    priceInput.classList.remove(
      "price-invalid",
      "price-valid"
    );

    if (priceError) {
      priceError.classList.remove("show");
      priceError.textContent = "";
    }

    if (!ticket) {
      if (priceInfo) {
        priceInfo.textContent =
          "Chọn vé để xem giá bán lại tối đa.";
      }
      submitBtn.disabled = true;
      return false;
    }

    const original = Number(ticket.originalPrice);
    const maxPrice = Math.floor(original * 110 / 100);

    if (!Number.isFinite(original) || original <= 0) {
      if (priceInfo) {
        priceInfo.textContent =
          "Không xác định được giá gốc của vé.";
      }
      submitBtn.disabled = true;
      return false;
    }

    if (priceInfo) {
      priceInfo.textContent =
        "Giá gốc: " + money(original) +
        " · Giá tối đa (110%): " + money(maxPrice);
    }

    if (priceInput.value.trim() === "") {
      submitBtn.disabled = true;
      return false;
    }

    const invalid =
      !Number.isSafeInteger(price) ||
      price < 1000 ||
      price > maxPrice;

    if (invalid) {
      priceInput.classList.add("price-invalid");

      if (priceError) {
        priceError.textContent = price > maxPrice
          ? "⚠ Giá bán vượt giới hạn! Tối đa " +
            money(maxPrice) + "."
          : "⚠ Vui lòng nhập giá hợp lệ từ 1.000đ.";

        priceError.classList.add("show");
      }

      submitBtn.disabled = true;
      return false;
    }

    priceInput.classList.add("price-valid");
    submitBtn.disabled = false;
    return true;
  }

  select.addEventListener("change", validateResalePrice);
  priceInput.addEventListener("input", validateResalePrice);

  function renderOwnedTickets() {
    const available = getAvailableTickets();

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn vé --";
    select.appendChild(placeholder);

    available.forEach((ticket, index) => {
      const option = document.createElement("option");
      option.value = String(index);

      option.textContent =
        ticket.eventTitle + " — " +
        ticket.ticketName + " — " +
        money(ticket.originalPrice);

      select.appendChild(option);
    });

    select.disabled = available.length === 0;
    submitBtn.disabled = true;
    validateResalePrice();
  }

  function renderListings() {
    const listings = getListings()
      .filter(item => item.status === "active")
      .reverse();

    list.replaceChildren();

    if (listings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Chưa có vé nào được đăng bán.";
      list.appendChild(empty);
      return;
    }

    listings.forEach(item => {
      const card = document.createElement("div");
      card.className = "listing";

      const title = document.createElement("h3");
      title.textContent = item.eventTitle;

      const type = document.createElement("p");
      type.className = "muted";
      type.textContent = "Loại vé: " + item.ticketName;

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = money(item.resalePrice);

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "Đang bán";

      const buy = document.createElement("button");
      buy.type = "button";
      buy.className = "btn";
      buy.textContent = "Mua lại (DEMO)";

      buy.addEventListener("click", () => {
        const all = getListings();
        const target = all.find(x => x.id === item.id);

        if (!target || target.status !== "active") {
          alert("Vé này không còn được bán.");
          renderListings();
          return;
        }

        const original = getOriginalPrice(
          target.eventId,
          target.ticketId,
          target.originalPrice
        );

        const resalePrice = Number(target.resalePrice);
        const maxPrice = Math.floor(original * 110 / 100);

        if (
          !Number.isFinite(original) ||
          original <= 0 ||
          !Number.isSafeInteger(resalePrice) ||
          resalePrice < 1000 ||
          resalePrice > maxPrice
        ) {
          alert(
            "Tin đăng không hợp lệ hoặc vượt giới hạn 110%."
          );
          return;
        }

        // Chỉ tạo đơn tạm, CHƯA đánh dấu đã bán.
        const draft = {
          type: "resale",
          resaleId: target.id,
          eventId: target.eventId,
          eventTitle: target.eventTitle,
          buyer: {},
          items: [{
            ticketTypeId: target.ticketId,
            name: target.ticketName,
            price: resalePrice,
            originalPrice: original,
            quantity: 1
          }],
          total: resalePrice,
          createdAt: new Date().toISOString()
        };

        sessionStorage.setItem(
          "tt_payment_draft",
          JSON.stringify(draft)
        );

        // Tránh dùng lại đồng hồ từ đơn thanh toán trước.
        sessionStorage.removeItem(
          "tt_payment_deadline_resale_" + target.id
        );

        window.location.href =
          "payment.html?id=" +
          encodeURIComponent(target.eventId) +
          "&resale=" +
          encodeURIComponent(target.id);
      });

      card.append(title, type, price, tag, buy);
      list.appendChild(card);
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    if (!validateResalePrice()) return;

    const ticket = getSelectedTicket();
    if (!ticket) return;

    const price = Number(priceInput.value);
    const original = Number(ticket.originalPrice);
    const maxPrice = Math.floor(original * 110 / 100);

    if (
      !Number.isSafeInteger(price) ||
      price < 1000 ||
      original <= 0 ||
      price > maxPrice
    ) {
      validateResalePrice();
      return;
    }

    const listings = getListings();

    listings.push({
      id: "RES-" + Date.now(),
      ...ticket,
      resalePrice: price,
      status: "active",
      createdAt: new Date().toISOString()
    });

    saveListings(listings);

    // Thông báo ngay trên trang, không dùng alert.
    form.reset();
    renderOwnedTickets();
    renderListings();

    const message = document.createElement("div");
    message.className = "notice";
    message.style.background = "#164b31";
    message.style.color = "#b8ff35";
    message.textContent =
      "✓ Đăng bán vé thành công (DEMO)!";

    const old = form.querySelector(".resale-success");
    if (old) old.remove();

    message.classList.add("resale-success");
    form.appendChild(message);
  });

  function renderResaleEvents() {
    const grid = document.getElementById("resaleEventGrid");
    if (!grid) return;

    const events = window.TT_SEED_EVENTS || [];
    grid.replaceChildren();

    events.forEach(event => {
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
        document.getElementById("market")
          ?.scrollIntoView({ behavior: "smooth" });
      });

      grid.appendChild(card);
    });
  }

  renderResaleEvents();
  renderOwnedTickets();
  renderListings();
})();
