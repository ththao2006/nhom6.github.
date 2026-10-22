
(() => {
  const root = document.getElementById("eventPage");
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id") || "ev001";

  function loadEvents() {
    try {
      const saved = JSON.parse(localStorage.getItem("tt_events"));
      return Array.isArray(saved) ? saved : window.TT_SEED_EVENTS;
    } catch {
      return window.TT_SEED_EVENTS;
    }
  }

  const events = loadEvents();
  const event = events.find(item => item.id === eventId);
  const artists = window.TT_SEED_ARTISTS || [];

  const money = value =>
    value === 0
      ? "Miễn phí"
      : new Intl.NumberFormat("vi-VN").format(value) + " đ";

  const formatDate = value =>
    new Date(value + "T12:00:00").toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

  if (!event) {
    root.innerHTML = `
      <div class="error">
        <h1>Không tìm thấy sự kiện</h1>
        <p class="muted">Sự kiện này không tồn tại hoặc đã bị xóa.</p>
        <a class="back" href="index.html">← Quay về trang chủ</a>
      </div>
    `;
    return;
  }

  const ended =
    event.status === "ended" ||
    new Date(event.date + "T23:59:59") < new Date();

  const eventArtists = artists.filter(artist =>
    (event.artistIds || []).includes(artist.id)
  );

  document.title = event.title + " | Ticketbox";

  root.innerHTML = `
    <section class="hero">
      <img id="eventPoster" alt="Poster sự kiện">
    </section>

    <div class="content">
      <div>
        <section class="panel">
          <span class="tag" id="eventGenre"></span>
          <h1 id="eventTitle"></h1>
          <p class="info">📅 <span id="eventDate"></span></p>
          <p class="info">🕒 <span id="eventTime"></span></p>
          <p class="info">📍 <span id="eventLocation"></span></p>
          <p class="info">🎤 Ban tổ chức: <span id="eventOrganizer"></span></p>
        </section>

        <section class="panel">
          <h2>Giới thiệu sự kiện</h2>
          <p class="muted" id="eventDescription"></p>
        </section>

        <section class="panel" id="artistsPanel">
          <h2>Nghệ sĩ tham gia</h2>
          <div class="artist-list" id="eventArtists"></div>
        </section>
      </div>

      <aside>
        <section class="panel">
          <h2>Thông tin vé</h2>
          <p class="muted">Giá vé từ</p>
          <div class="price" id="eventPrice"></div>
          <div id="eventTicketTypes"></div>
          <button class="button" id="buyTicket"></button>
        </section>
      </aside>
    </div>
  `;

  document.getElementById("eventPoster").src = event.image;
  document.getElementById("eventGenre").textContent = event.genre;
  document.getElementById("eventTitle").textContent = event.title;
  document.getElementById("eventDate").textContent = formatDate(event.date);
  document.getElementById("eventTime").textContent = event.time;
  document.getElementById("eventLocation").textContent =
    event.venue + " — " + event.location;
  document.getElementById("eventOrganizer").textContent = event.organizer;
  document.getElementById("eventDescription").textContent = event.description;
  document.getElementById("eventPrice").textContent = money(event.price);

  const ticketContainer = document.getElementById("eventTicketTypes");

  (event.ticketTypes || []).forEach(ticket => {
    const item = document.createElement("div");
    item.className = "ticket";

    const name = document.createElement("strong");
    name.textContent = ticket.name;

    const price = document.createElement("span");
    price.className = "ticket-price";
    price.textContent = money(ticket.price);

    const quantity = document.createElement("div");
    quantity.className = "muted";
    quantity.textContent = "Số vé còn: " + ticket.quantity;

    item.append(name, price, quantity);
    ticketContainer.appendChild(item);
  });

  const artistContainer = document.getElementById("eventArtists");

  if (eventArtists.length === 0) {
    document.getElementById("artistsPanel").hidden = true;
  } else {
    eventArtists.forEach(artist => {
      const item = document.createElement("div");
      item.className = "artist";

      const image = document.createElement("img");
      image.src = artist.image;
      image.alt = artist.name;

      const name = document.createElement("strong");
      name.textContent = artist.name;

      item.append(image, name);
      artistContainer.appendChild(item);
    });
  }

  const buyButton = document.getElementById("buyTicket");
  const available = (event.ticketTypes || []).some(
    ticket => ticket.quantity > 0
  );

  if (ended) {
    buyButton.textContent = "Sự kiện đã kết thúc";
    buyButton.disabled = true;
  } else if (!available) {
    buyButton.textContent = "Đã hết vé";
    buyButton.disabled = true;
  } else {
    buyButton.textContent = event.free ? "Đăng ký tham gia" : "Mua vé ngay";
    buyButton.addEventListener("click", () => {
      
window.location.href = "checkout.html?id=" + encodeURIComponent(event.id);
    });
  }
})();
