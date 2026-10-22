
(() => {
  const form = document.getElementById("resaleForm");
  const select = document.getElementById("ownedTicket");
  const priceInput = document.getElementById("resalePrice");
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

    const available = getAvailableTickets();
    const ticket = available[Number(select.value)];
    const price = Number(priceInput.value);

    if (!ticket) {
      alert("Vui lòng chọn vé hợp lệ.");
      return;
    }

    if (!Number.isFinite(price) || price < 1000) {
      alert("Giá bán phải từ 1.000đ.");
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

  renderOwnedTickets();
  renderListings();
})();
