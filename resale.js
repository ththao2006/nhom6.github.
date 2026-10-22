
(() => {
  const form = document.getElementById("resaleForm");
  const select = document.getElementById("ownedTicket");
  const priceInput = document.getElementById("resalePrice");
  
  const priceInfo = document.getElementById("priceInfo");
  const priceError = document.getElementById("priceError");
  const submitBtn = form.querySelector('button[type="submit"]');

  function validateResalePrice() {
    const available = getAvailableTickets();
    const ticket = available[Number(select.value)];
    const price = Number(priceInput.value);

    priceInput.classList.remove("price-invalid", "price-valid");
    priceError.classList.remove("show");
    priceError.textContent = "";

    if (!ticket) {
      priceInfo.textContent =
        "Chọn vé để xem giá bán lại tối đa.";
      submitBtn.disabled = true;
      return false;
    }

    const original = Number(ticket.originalPrice);
    const maxPrice = Math.floor(original * 110 / 100);

    if (!Number.isFinite(original) || original <= 0) {
      priceInfo.textContent = "Không xác định được giá gốc.";
      submitBtn.disabled = true;
      return false;
    }

    priceInfo.textContent =
      "Giá gốc: " + money(original) +
      " · Giá tối đa (110%): " + money(maxPrice);

    if (priceInput.value.trim() === "") {
      submitBtn.disabled = true;
      return false;
    }

    const invalid = !Number.isSafeInteger(price) ||
      price < 1000 || price > maxPrice;

    if (invalid) {
      priceInput.classList.add("price-invalid");

      priceError.textContent = price > maxPrice
        ? "⚠ Giá bán vượt giới hạn! Tối đa " +
          money(maxPrice) + "."
        : "⚠ Vui lòng nhập giá hợp lệ từ 1.000đ.";

      priceError.classList.add("show");
      submitBtn.disabled = true;
      return false;
    }

    priceInput.classList.add("price-valid");
    submitBtn.disabled = false;
    return true;
  }

  select.addEventListener("change", validateResalePrice);
  priceInput.addEventListener("input", validateResalePrice);

  const list = document.getElementById("resaleList");

  const money = value =>
    new Intl.NumberFormat("vi-VN").format(value) + " đ";

  const readArray = key => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const getOrders = () => readArray("tt_orders");
  const getListings = () => readArray("tt_resales");

  const saveListings = listings =>
    localStorage.setItem("tt_resales", JSON.stringify(listings));

  function getAvailableTickets() {
    const orders = getOrders();
    const listings = getListings();

    const available = [];

    orders.forEach(order => {
      if (order.status !== "paid") return;

      (order.items || []).forEach(item => {
        const quantity = Number(item.quantity) || 0;

        const alreadyListed = listings.filter(listing =>
          listing.orderId === order.id &&
          listing.ticketId === item.id &&
          listing.status !== "cancelled"
        ).length;

        const remaining = Math.max(0, quantity - alreadyListed);

        for (let i = 0; i < remaining; i++) {
          available.push({
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: order.eventTitle,
            ticketId: item.id,
            ticketName: item.name,
            originalPrice: Number(item.price) || 0
          });
        }
      });
    });

    return available;
  }

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

    form.querySelector('button[type="submit"]').disabled =
      available.length === 0;
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
      buy.className = "btn";
      buy.textContent = "Mua lại (DEMO)";

      buy.addEventListener("click", () => {
        if (!confirm(
          "Xác nhận mua lại vé với giá " +
          money(item.resalePrice) + "?"
        )) return;

        const all = getListings();
        const target = all.find(x => x.id === item.id);

        if (!target || target.status !== "active") {
          alert("Vé này không còn được bán.");
          renderListings();
          return;
        }

        target.status = "sold";
        target.soldAt = new Date().toISOString();

        saveListings(all);
        alert("Mua lại vé thành công (DEMO)!");
        renderListings();
        renderOwnedTickets();
      });

      card.append(title, type, price, tag, buy);
      list.appendChild(card);
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validateResalePrice()) return;

    const available = getAvailableTickets();
    const ticket = available[Number(select.value)];
    const price = Number(priceInput.value);

    if (!ticket) {
      alert("Vui lòng chọn vé hợp lệ.");
      return;
    }

   
    const originalPrice = Number(ticket.originalPrice);
    const maxResalePrice = Math.floor(originalPrice * 110 / 100);

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      alert("Không xác định được giá gốc của vé.");
      return;
    }

    if (!Number.isSafeInteger(price) || price < 1000) {
      alert("Giá bán phải là số nguyên từ 1.000đ.");
      return;
    }

    if (price > maxResalePrice) {
      alert(
        "Giá bán lại không được vượt quá 110% giá gốc!\n" +
        "Giá gốc: " + money(originalPrice) + "\n" +
        "Giá tối đa: " + money(maxResalePrice)
      );
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

    alert("Đăng bán vé thành công (DEMO)!");

    form.reset();
    renderOwnedTickets();
    renderListings();
  });

  // Hiển thị poster sự kiện
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
          .scrollIntoView({ behavior: "smooth" });
      });

      grid.appendChild(card);
    });
  }

  renderResaleEvents();

  renderOwnedTickets();
  renderListings();
})();
