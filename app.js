(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => n === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(n);
  const dateText = d => new Date(d+"T12:00:00").toLocaleDateString("vi-VN",{day:"2-digit",month:"short",year:"numeric"});
  const read = (key, fallback) => { try { const v=JSON.parse(localStorage.getItem("tt_"+key)); return v ?? fallback; } catch { return fallback; } };
  const write = (key, val) => localStorage.setItem("tt_"+key, JSON.stringify(val));
  const clone = x => JSON.parse(JSON.stringify(x));
  let events = read("events", clone(window.TT_SEED_EVENTS));
  let artists = clone(window.TT_SEED_ARTISTS);
  let user = read("user", null);
  let orders = read("orders", []);
  let tickets = read("tickets", []);
  let cart = read("cart", []);
  let activeCategory = "";
  let toastTimer;

  const toast = msg => { const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600); };
  const save = () => { write("events",events); write("user",user); write("orders",orders); write("tickets",tickets); write("cart",cart); };
  const eventStatus = ev => { if(ev.status==="ended" || new Date(ev.date+"T23:59:59") < new Date()) return "ended"; if(new Date(ev.date+"T00:00:00") <= new Date()) return "live"; return ev.status==="draft" ? "draft" : "upcoming"; };
  const eventCard = ev => `<article class="event-card" data-open-event="${ev.id}" tabindex="0" role="button" aria-label="Xem ${ev.title}">
    <div class="event-poster" style="background-image:url('${ev.image}')"><span class="event-tag">${ev.free||ev.price===0?"FREE ENTRY":ev.genre}</span><button class="event-heart" data-fav="${ev.id}" aria-label="Lưu sự kiện">♡</button></div>
    <div class="event-card-body"><div class="event-date">${dateText(ev.date)} · ${ev.time||"19:00"}</div><h3>${ev.title}</h3><div class="event-location">⌖ ${ev.location} · ${ev.venue}</div><div class="event-card-bottom"><div class="event-price">${money(ev.price)}<small>${ev.free||ev.price===0?"Không mất phí":"Giá vé từ"}</small></div><span class="card-arrow">↗</span></div></div></article>`;
 
function renderEvents() {
  const q = ($("#searchInput")?.value || "").trim().toLowerCase();
  const genre = $("#genreFilter")?.value || "";
  const loc = $("#locationFilter")?.value || "";
  const price = $("#priceFilter")?.value || "";
  const time = $("#timeFilter")?.value || "";

  // Lấy ngày hiện tại theo giờ địa phương
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // Kiểm tra thời gian diễn ra sự kiện
  function matchesTime(e) {
    if (!time) return true;

    const eventDate = new Date(e.date + "T12:00:00");
    const eventDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );

    const diff = Math.round((eventDay - today) / 86400000);

    if (time === "today") return diff === 0;

    if (time === "tomorrow") return diff === 1;

    if (time === "7days") {
      return diff >= 0 && diff <= 7;
    }

    if (time === "30days") {
      return diff >= 0 && diff <= 30;
    }

    if (time === "weekend") {
      const saturdayOffset = (6 - today.getDay() + 7) % 7;

      const saturday = new Date(today);
      saturday.setDate(today.getDate() + saturdayOffset);

      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);

      return eventDay >= saturday && eventDay <= sunday;
    }

    return true;
  }

  // Lọc danh sách sự kiện
  const list = events.filter(e => {
    const searchText = [
      e.title,
      e.location,
      e.venue,
      e.genre,
      e.organizer
    ].join(" ").toLowerCase();

    const matchesSearch = !q || searchText.includes(q);

    const matchesGenre = !genre || e.genre === genre;

    const matchesLocation = !loc || e.location === loc;

    const matchesPrice = !price ||
      (price === "free"
        ? e.free || e.price === 0
        : !e.free && e.price > 0);

    const matchesCategory =
      !activeCategory || e.genre === activeCategory;

    return (
      matchesSearch &&
      matchesGenre &&
      matchesLocation &&
      matchesPrice &&
      matchesTime(e) &&
      matchesCategory &&
      eventStatus(e) !== "draft" &&
      e.status !== "hidden"
    );
  });

  // Hiển thị danh sách sự kiện
  $("#eventGrid").innerHTML = list.map(eventCard).join("");

  // Hiển thị thông báo nếu không tìm thấy sự kiện
  $("#emptyEvents").classList.toggle(
    "hidden",
    list.length > 0
  );
}

  function renderArtists() {
    $("#artistGrid").innerHTML=artists.map(a=>`<article class="artist-card" tabindex="0" data-artist="${a.id}" style="background-image:url('${a.image}')"><div class="artist-info"><h3>${a.name}</h3><p>${a.role}</p><span>XEM HỒ SƠ ↗</span></div></article>`).join("");
  }
  function modal(content) { $("#modalContent").innerHTML=content; $("#modalBackdrop").classList.remove("hidden"); document.body.style.overflow="hidden"; }
  function closeModal(){ $("#modalBackdrop").classList.add("hidden"); document.body.style.overflow=""; }
  function openEvent(id) {
    const e=events.find(x=>x.id===id); if(!e)return;
    const status=eventStatus(e), soldOut=e.ticketTypes.every(t=>t.quantity<=0);
    modal(`<div class="modal-grid"><img class="modal-poster" src="${e.image}" alt=""><div><span class="eyebrow">${e.genre} · ${status==="ended"?"ĐÃ KẾT THÚC":status==="live"?"ĐANG DIỄN RA":"SẮP DIỄN RA"}</span><h2>${e.title}</h2><p>◷ ${dateText(e.date)} · ${e.time||"19:00"}</p><p>⌖ ${e.venue}, ${e.location}</p><p>${e.description}</p><div class="pill-row"><span class="pill">${e.organizer}</span><span class="pill">${e.ticketTypes.length} loại vé</span></div><h3>${money(e.price)} <small class="small-note">/ vé từ</small></h3>${status==="ended"?'<div class="notice">Sự kiện đã kết thúc, hiện không thể đặt vé.</div>':soldOut?'<div class="notice">Sự kiện đã hết vé.</div>':`<button class="button button-primary full" data-book="${e.id}">Chọn vé <span>→</span></button>`}<button class="button button-secondary full" data-share="${e.id}">Chia sẻ sự kiện ↗</button></div></div>`);
  }
  function openBooking(id) {
    const e=events.find(x=>x.id===id); if(!e)return;
    if(!user){toast("Đăng nhập demo trước khi đặt vé nhé.");openLogin("customer",()=>openBooking(id));return;}
    if(eventStatus(e)==="ended"){toast("Sự kiện đã kết thúc.");return;}
    const chosen={};
    const rows=e.ticketTypes.map((t,i)=>`<label class="price-option ${i===0?"selected":""}"><span><input type="radio" name="ticketType" value="${t.id}" ${i===0?"checked":""} style="width:auto;accent-color:var(--accent)"> <strong>${t.name}</strong><small>${t.seated?"Có chọn ghế":"Vé không chọn ghế"} · Còn ${t.quantity}</small></span><strong>${money(t.price)}</strong></label>`).join("");
    modal(`<span class="eyebrow">STEP 01 / SELECT TICKETS</span><h2>Chọn vé của bạn</h2><p>${e.title} · ${dateText(e.date)} · ${e.location}</p><form id="bookingForm"><div class="price-list">${rows}</div><label class="form-label">Số lượng vé</label><select id="ticketQty">${[1,2,3,4,5,6].map(n=>`<option>${n}</option>`).join("")}</select><div id="seatArea"></div><div class="event-card-bottom"><span>Tạm tính</span><strong id="bookingTotal">${money(e.ticketTypes[0].price)}</strong></div><button class="button button-primary full" type="submit">Tiếp tục <span>→</span></button></form>`);
    const update=()=>{const t=e.ticketTypes.find(x=>x.id===$('input[name="ticketType"]:checked')?.value)||e.ticketTypes[0];const qty=Number($("#ticketQty").value);$("#bookingTotal").textContent=money(t.price*qty);$("#seatArea").innerHTML=t.seated?'<div class="notice">Loại vé này có sơ đồ ghế. Sau khi xác nhận, bạn sẽ chọn ghế ở bước tiếp theo.</div>':''; $$(".price-option").forEach(l=>l.classList.toggle("selected",!!$("input:checked",l)));};
    $$('input[name="ticketType"]').forEach(x=>x.addEventListener("change",update));$("#ticketQty").addEventListener("change",update);
    $("#bookingForm").addEventListener("submit",ev=>{ev.preventDefault();const t=e.ticketTypes.find(x=>x.id===$('input[name="ticketType"]:checked').value);const qty=Number($("#ticketQty").value);if(qty>t.quantity){toast("Số lượng vé vượt quá số vé còn lại.");return;}cart=[{eventId:e.id,ticketTypeId:t.id,qty,seatIds:[],unitPrice:t.price}];save();if(t.seated)openSeatMap(e.id,t.id,qty);else openCheckout();});
  }
  function openSeatMap(eventId,typeId,qty){
    const e=events.find(x=>x.id===eventId);const sold=read("soldSeats",[]);
    let selected=[];
    const rows=["A","B","C","D","E"];
    const seatMarkup=rows.map(r=>`<div class="seat-row"><span class="row-label">${r}</span>${Array.from({length:10},(_,i)=>{const id=r+(i+1),isSold=sold.includes(eventId+"-"+id);return `<button type="button" class="seat ${isSold?"sold":""}" data-seat="${id}" ${isSold?"disabled":""}>${i+1}</button>`}).join("")}</div>`).join("");
    modal(`<span class="eyebrow">STEP 02 / CHOOSE YOUR SEAT</span><h2>Chọn vị trí ghế</h2><p>${e.title} · Chọn ${qty} ghế</p><div class="seat-legend"><span><i class="seat-dot available"></i>Còn trống</span><span><i class="seat-dot selected"></i>Đang chọn</span><span><i class="seat-dot sold"></i>Đã bán</span></div><div class="seat-map"><div class="stage">STAGE / SÂN KHẤU</div>${seatMarkup}</div><p id="seatCount">Đã chọn 0/${qty} ghế</p><button class="button button-primary full" id="confirmSeats">Xác nhận ghế <span>→</span></button>`);
    $$("[data-seat]").forEach(btn=>btn.addEventListener("click",()=>{const id=btn.dataset.seat;if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<qty)selected.push(id);else toast(`Bạn chỉ được chọn ${qty} ghế.`);btn.classList.toggle("selected",selected.includes(id));$("#seatCount").textContent=`Đã chọn ${selected.length}/${qty} ghế`; }));
    $("#confirmSeats").addEventListener("click",()=>{if(selected.length!==qty){toast(`Vui lòng chọn đủ ${qty} ghế.`);return;}cart[0].seatIds=selected;save();openCheckout();});
  }
  function openCheckout(){
    const c=cart[0];if(!c){toast("Giỏ vé đang trống.");return;}const e=events.find(x=>x.id===c.eventId),t=e.ticketTypes.find(x=>x.id===c.ticketTypeId);
    modal(`<span class="eyebrow">STEP 03 / CHECKOUT</span><h2>Xác nhận đơn hàng</h2><p>Kiểm tra thông tin trước khi thanh toán.</p><div class="demo-accounts"><strong>${e.title}</strong><p>${dateText(e.date)} · ${e.venue}, ${e.location}</p><p>${t.name} × ${c.qty}${c.seatIds.length?" · Ghế "+c.seatIds.join(", "):""}</p><div class="event-card-bottom"><span>Tổng thanh toán</span><strong>${money(c.unitPrice*c.qty)}</strong></div></div><label class="form-label">Tên người mua</label><input id="buyerName" value="${user.name}" required><label class="form-label">Email nhận vé</label><input id="buyerEmail" type="email" value="${user.email}" required><div class="notice">Đây là thanh toán mô phỏng. Không nhập thông tin thẻ hoặc tài khoản ngân hàng.</div><button class="button button-primary full" id="paySuccess">Thanh toán mô phỏng thành công ✓</button><button class="button button-secondary full" id="payFail">Mô phỏng thanh toán thất bại</button>`);
    $("#paySuccess").addEventListener("click",()=>finishPayment(true));$("#payFail").addEventListener("click",()=>finishPayment(false));
  }
  function finishPayment(success){
    if(!success){modal(`<span class="eyebrow">PAYMENT / FAILED</span><h2>Thanh toán chưa thành công</h2><p>Đơn hàng chưa được xác nhận và chưa tạo vé. Bạn có thể thử lại.</p><button class="button button-primary full" id="retryPayment">Thử lại thanh toán</button><button class="button button-secondary full" id="cancelPayment">Hủy giao dịch</button>`);$("#retryPayment").onclick=openCheckout;$("#cancelPayment").onclick=()=>{cart=[];save();closeModal();};return;}
    const c=cart[0],e=events.find(x=>x.id===c.eventId),t=e.ticketTypes.find(x=>x.id===c.ticketTypeId);
    const order={id:"TT"+Date.now().toString().slice(-8),userId:user.id,eventId:e.id,ticketTypeId:t.id,qty:c.qty,seatIds:c.seatIds,total:c.unitPrice*c.qty,status:"paid",createdAt:new Date().toISOString(),buyerName:$("#buyerName")?.value||user.name,buyerEmail:$("#buyerEmail")?.value||user.email};
    orders.unshift(order);const sold=read("soldSeats",[]);c.seatIds.forEach(s=>sold.push(e.id+"-"+s));write("soldSeats",sold);
    t.quantity=Math.max(0,t.quantity-c.qty);
    for(let i=0;i<c.qty;i++)tickets.unshift({id:"TKT"+Date.now().toString().slice(-7)+i,orderId:order.id,eventId:e.id,type:t.name,seat:c.seatIds[i]||"",userId:user.id,used:false});
    cart=[];save();
    modal(`<div class="ticket-preview"><span class="eyebrow">PAYMENT SUCCESSFUL</span><h2>Vé của bạn đã sẵn sàng.</h2><p>${e.title}</p><div class="qr-box"><span>TT VERIFIED</span></div><div class="ticket-code">${order.id}</div><p>${dateText(e.date)} · ${e.location}</p><h3>${money(order.total)}</h3><span class="status-pill">ĐÃ THANH TOÁN</span></div><button class="button button-primary full" id="viewMyTickets">Xem vé của tôi <span>→</span></button><p class="small-note">Mã QR trên là hình minh họa, không dùng để check-in thực tế.</p>`);
    $("#viewMyTickets").onclick=()=>{closeModal();openTickets();};
  }
  function openLogin(role="customer", callback){
    modal(`<span class="eyebrow">WELCOME TO TICKETBOX</span><h2>${user?"Đổi tài khoản":"Đăng nhập"}</h2><p>Đăng nhập demo theo vai trò để trải nghiệm hệ thống.</p><div class="demo-accounts"><strong>Tài khoản demo nhanh</strong><button data-demo="customer">↗ Khách hàng — customer@ticketbox.demo</button><button data-demo="organizer">↗ Ban tổ chức — organizer@ticketbox.demo</button><button data-demo="admin">↗ Quản trị viên — admin@ticketbox.demo</button></div><form id="loginForm"><label class="form-label">Email</label><input id="loginEmail" type="email" value="${role==="admin"?"admin@ticketbox.demo":role==="organizer"?"organizer@ticketbox.demo":"customer@ticketbox.demo"}" required><label class="form-label">Mật khẩu demo</label><input id="loginPassword" type="password" value="ticketbox123" required><button class="button button-primary full" type="submit">Đăng nhập <span>→</span></button></form><p class="small-note">Đây là đăng nhập mô phỏng trên trình duyệt, không phải xác thực an toàn.</p>`);
    $$("[data-demo]").forEach(b=>b.onclick=()=>{const r=b.dataset.demo;$("#loginEmail").value=`${r}@ticketbox.demo`;});
    $("#loginForm").onsubmit=ev=>{ev.preventDefault();const email=$("#loginEmail").value.trim();let r=email.startsWith("admin@")?"admin":email.startsWith("organizer@")?"organizer":"customer";user={id:r+"-demo",name:r==="admin"?"Ticketbox Admin":r==="organizer"?"Minh Anh — Organizer":"Nguyễn Minh Anh",email,role:r};save();closeModal();$("#accountButton").textContent="Tài khoản";toast("Đăng nhập demo thành công.");if(callback)callback();else if(r==="organizer")location.hash="#organizer-dashboard";else if(r==="admin")location.hash="#admin-dashboard";};
  }
  function openTickets(){
    if(!user){openLogin();return;}
    const own=tickets.filter(t=>t.userId===user.id);
    modal(`<span class="eyebrow">YOUR EXPERIENCES</span><h2>Vé của tôi</h2><p>Vé điện tử đã được tạo từ các đơn hàng demo.</p>${own.length?own.map(t=>{const e=events.find(x=>x.id===t.eventId);return `<div class="demo-accounts"><strong>${e?.title||"Sự kiện"}</strong><p>${dateText(e?.date||"2026-11-21")} · ${e?.location||""}</p><p>Loại vé: ${t.type}${t.seat?" · Ghế "+t.seat:""}</p><span class="ticket-code">${t.id}</span> <span class="status-pill">ĐÃ THANH TOÁN</span></div>`}).join(""):'<div class="empty-state"><span>♧</span><h3>Chưa có vé nào</h3><p>Khám phá sự kiện và đặt vé đầu tiên của bạn.</p></div>'}<button class="button button-primary full" id="findEvents">Khám phá sự kiện</button>`);
    $("#findEvents").onclick=()=>{closeModal();location.hash="#events";};
  }
  function openArtist(id){
    const a=artists.find(x=>x.id===id);if(!a)return;
    const related=events.filter(e=>a.eventIds.includes(e.id));
    modal(`<div class="modal-grid"><img class="modal-poster" src="${a.image}" alt="${a.name}"><div><span class="eyebrow">ARTIST SPOTLIGHT</span><h2>${a.name}</h2><p>${a.role}</p><p>${a.bio}</p><h3>Sự kiện tham gia</h3>${related.map(e=>`<div class="demo-accounts"><strong>${e.title}</strong><p>${dateText(e.date)} · ${e.location}</p><button data-open-event="${e.id}">Xem sự kiện ↗</button></div>`).join("")||"<p>Chưa có sự kiện được công bố.</p>"}</div></div>`);
  }
  function openOrganizer(){
    if(!user||!["organizer","admin"].includes(user.role)){openLogin("organizer",()=>openOrganizer());return;}
    const own=events.filter(e=>e.organizerId===user.id||e.organizer===user.name||e.organizer==="True Live"&&user.role==="admin");
    modal(`<span class="eyebrow">ORGANIZER STUDIO</span><h2>Quản lý sự kiện</h2><p>Xin chào ${user.name}. Tạo sự kiện demo và theo dõi danh sách của bạn.</p><div class="stat-grid"><div class="stat-card"><span>Sự kiện của bạn</span><strong>${own.length}</strong></div><div class="stat-card"><span>Vé đã tạo</span><strong>${tickets.length}</strong></div><div class="stat-card"><span>Đơn đã thanh toán</span><strong>${orders.filter(o=>o.status==="paid").length}</strong></div></div><button class="button button-primary" id="showCreate">＋ Tạo sự kiện mới</button><div id="createFormWrap"></div><h3>Danh sách sự kiện</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Sự kiện</th><th>Ngày</th><th>Trạng thái</th></tr></thead><tbody>${own.map(e=>`<tr><td>${e.title}</td><td>${dateText(e.date)}</td><td><span class="status-pill">${eventStatus(e)==="ended"?"Đã kết thúc":"Đang hiển thị"}</span></td></tr>`).join("")||'<tr><td colspan="3">Chưa có sự kiện tự tạo.</td></tr>'}</tbody></table></div>`);
    $("#showCreate").onclick=()=>{$("#createFormWrap").innerHTML=`<form id="createEventForm" class="demo-accounts"><label class="form-label">Tên sự kiện</label><input name="title" required placeholder="Tên sự kiện"><label class="form-label">Thể loại</label><select name="genre"><option>Âm nhạc</option><option>Festival</option><option>Workshop</option><option>Nghệ thuật</option><option>Thể thao</option></select><label class="form-label">Địa điểm</label><select name="location"><option>Hà Nội</option><option>TP. Hồ Chí Minh</option><option>Đà Nẵng</option></select><label class="form-label">Tên địa điểm / venue</label><input name="venue" required placeholder="Ví dụ: Nhà hát lớn"><label class="form-label">Ngày diễn ra</label><input name="date" type="date" min="${new Date().toISOString().slice(0,10)}" required><label class="form-label">Giờ</label><input name="time" type="time" value="19:00" required><label class="form-label">Giá vé (VND, nhập 0 nếu miễn phí)</label><input name="price" type="number" min="0" value="200000" required><label class="form-label">Ảnh poster (URL)</label><input name="image" type="url" placeholder="https://..."><label class="form-label">Mô tả</label><textarea name="description" rows="3" required></textarea><button class="button button-primary full">Lưu sự kiện demo</button></form>`;
      $("#createEventForm").onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target),price=Number(f.get("price"));const e={id:"ev"+Date.now(),title:f.get("title"),genre:f.get("genre"),location:f.get("location"),venue:f.get("venue"),date:f.get("date"),time:f.get("time"),price,free:price===0,status:"upcoming",organizer:user.name,organizerId:user.id,artistIds:[],image:f.get("image")||"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85",description:f.get("description"),ticketTypes:[{id:"standard",name:"Vé tiêu chuẩn",price,quantity:200,seated:false}]};events.unshift(e);save();closeModal();renderEvents();toast("Đã tạo sự kiện demo.");};
    };
  }
  function openAdmin(){
    if(!user||user.role!=="admin"){openLogin("admin",()=>openAdmin());return;}
    modal(`<span class="eyebrow">ADMIN CONTROL</span><h2>Quản trị hệ thống</h2><p>Giao diện quản trị demo — các thay đổi chỉ lưu trên trình duyệt hiện tại.</p><div class="stat-grid"><div class="stat-card"><span>Tổng sự kiện</span><strong>${events.length}</strong></div><div class="stat-card"><span>Đơn hàng</span><strong>${orders.length}</strong></div><div class="stat-card"><span>Vé điện tử</span><strong>${tickets.length}</strong></div></div><h3>Quản lý sự kiện</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Tên sự kiện</th><th>BTC</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${events.map(e=>`<tr><td>${e.title}</td><td>${e.organizer}</td><td><span class="status-pill ${e.status==="hidden"?"off":""}">${e.status==="hidden"?"Đã ẩn":eventStatus(e)==="ended"?"Đã kết thúc":"Đang hiển thị"}</span></td><td><button class="pill" data-toggle-event="${e.id}">${e.status==="hidden"?"Hiện lại":"Ẩn"}</button></td></tr>`).join("")}</tbody></table></div><p class="small-note">Tài khoản demo không có cơ sở dữ liệu dùng chung. Vai trò admin chỉ là mô phỏng.</p>`);
  }
  function handleModalClick(ev){
    const event=ev.target.closest("[data-open-event]");if(event){openEvent(event.dataset.openEvent);return;}
    const book=ev.target.closest("[data-book]");if(book){openBooking(book.dataset.book);return;}
    const artist=ev.target.closest("[data-artist]");if(artist){openArtist(artist.dataset.artist);return;}
    const share=ev.target.closest("[data-share]");if(share){const url=location.href.split("#")[0]+"#event-"+share.dataset.share;navigator.clipboard?.writeText(url).then(()=>toast("Đã sao chép liên kết demo.")).catch(()=>toast(url));return;}
    const toggle=ev.target.closest("[data-toggle-event]");if(toggle){const e=events.find(x=>x.id===toggle.dataset.toggleEvent);e.status=e.status==="hidden"?"upcoming":"hidden";save();openAdmin();toast("Đã cập nhật trạng thái sự kiện.");return;}
  }
  $("#filterForm").addEventListener("submit",ev=>{ev.preventDefault();renderEvents();location.hash="#events";});
$("#searchInput").addEventListener("input", renderEvents);  
["genreFilter", "locationFilter", "priceFilter", "timeFilter"]
  .forEach(id => {
    $("#" + id).addEventListener("change", () => {
      activeCategory = "";
      renderEvents();
    });
  });

function resetEventFilters() {
  ["genreFilter", "locationFilter", "priceFilter", "timeFilter"]
    .forEach(id => {
      $("#" + id).value = "";
    });

  $("#searchInput").value = "";

  if ($("#headerSearchInput")) {
    $("#headerSearchInput").value = "";
  }

  activeCategory = "";
  renderEvents();
}

$("#resetFilters").onclick = resetEventFilters;

$("#emptyEvents").addEventListener("click", ev => {
  if (ev.target.closest("[data-reset-filters]")) {
    resetEventFilters();
  }
});


$("#eventGrid").addEventListener("click", ev => {
  const fav = ev.target.closest("[data-fav]");

  if (fav) {
    ev.stopPropagation();
    let f = read("favorites", []);
    f = f.includes(fav.dataset.fav)
      ? f.filter(x => x !== fav.dataset.fav)
      : [...f, fav.dataset.fav];

    write("favorites", f);
    fav.textContent = f.includes(fav.dataset.fav) ? "♥" : "♡";
    toast(f.includes(fav.dataset.fav) ? "Đã lưu sự kiện" : "Đã bỏ lưu sự kiện");
    return;
  }

  const card = ev.target.closest("[data-open-event]");

  if (card) {
    window.location.href =
      "event.html?id=" + encodeURIComponent(card.dataset.openEvent);
  }
});
  $("#artistGrid").addEventListener("click",ev=>{const a=ev.target.closest("[data-artist]");if(a)openArtist(a.dataset.artist);});
  $("#modalContent").addEventListener("click",handleModalClick);
  $("#modalClose").onclick=closeModal;$("#modalBackdrop").addEventListener("click",ev=>{if(ev.target===$("#modalBackdrop"))closeModal();});

document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") closeModal();

  if (ev.key === "Enter" && ev.target.matches("[data-open-event]")) {
    window.location.href =
      "event.html?id=" + encodeURIComponent(ev.target.dataset.openEvent);
  }
});
  $("#accountButton").onclick=()=>{if(user){modal(`<span class="eyebrow">YOUR ACCOUNT</span><h2>${user.name}</h2><p>${user.email}</p><span class="pill">Vai trò: ${user.role}</span><button class="button button-primary full" id="accountTickets">Vé của tôi</button>${user.role==="organizer"?'<button class="button button-secondary full" id="accountOrganizer">Quản lý sự kiện</button>':""}${user.role==="admin"?'<button class="button button-secondary full" id="accountAdmin">Quản trị</button>':""}<button class="button button-secondary full" id="logoutButton">Đăng xuất</button>`);$("#accountTickets").onclick=openTickets;if($("#accountOrganizer"))$("#accountOrganizer").onclick=openOrganizer;if($("#accountAdmin"))$("#accountAdmin").onclick=openAdmin;$("#logoutButton").onclick=()=>{user=null;save();closeModal();$("#accountButton").textContent="Đăng nhập";toast("Đã đăng xuất.");};}else openLogin();};
  $("#menuToggle").onclick=()=>$(".main-nav").classList.toggle("open");
  $$(".main-nav a").forEach(a=>a.addEventListener("click",()=>$(".main-nav").classList.remove("open")));
  $("#app").addEventListener("click",ev=>{const a=ev.target.closest('a[href="#organizer-dashboard"]');if(a){ev.preventDefault();openOrganizer();}const ticketsLink=ev.target.closest('a[href="#my-tickets"]');if(ticketsLink){ev.preventDefault();openTickets();}});
  function routeHash(){const h=location.hash;if(h.startsWith("#event-"))openEvent(h.slice(7));else if(h==="#organizer-dashboard")openOrganizer();else if(h==="#admin-dashboard")openAdmin();else if(h==="#my-tickets")openTickets();}
 
  // =========================================
  // FEATURED EVENTS SLIDER
  // 2 posters on desktop, 1 on mobile
  // =========================================

  const featuredTrack = $("#sliderTrack");
  const featuredDots = $("#sliderDots");
  const featuredSlider = $("#featuredSlider");

  let featuredPage = 0;
  let featuredTimer = null;

  // Lấy các sự kiện sắp diễn ra
  function featuredEvents() {
    return events
      .filter(e =>
        eventStatus(e) === "upcoming" &&
        e.status !== "hidden" &&
        Array.isArray(e.ticketTypes) &&
e.ticketTypes.some(t => t.quantity > 0)
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Máy tính: 2 poster, điện thoại: 1 poster
  function featuredPerPage() {
    return window.matchMedia("(max-width: 650px)").matches
      ? 1
      : 2;
  }

  function renderFeatured() {
    const list = featuredEvents();
    const perPage = featuredPerPage();

    const pageCount = Math.max(
      1,
      Math.ceil(list.length / perPage)
    );

    featuredPage =
      ((featuredPage % pageCount) + pageCount) % pageCount;

    const start = featuredPage * perPage;
    const shown = list.slice(start, start + perPage);

    if (shown.length === 0) {
      featuredTrack.innerHTML = `
        <div class="slider-empty">
          Hiện chưa có sự kiện sắp diễn ra.
        </div>
      `;
    } else {
      featuredTrack.innerHTML = shown.map(e => `
        <article
          class="slider-card"
          data-featured-event="${e.id}"
          tabindex="0"
          role="button"
          aria-label="Xem chi tiết ${e.title}"
        >
          <img
            class="slider-card-image"
            src="${e.image}"
            alt="Poster ${e.title}"
            loading="lazy"
          >

          <div class="slider-card-content">

            <span class="slider-card-category">
              ${e.genre}
            </span>

            <h2>${e.title}</h2>

            <div class="slider-card-meta">
              ◷ ${dateText(e.date)} · ${e.time || "19:00"}
              <span> · </span>
              ⌖ ${e.location}
            </div>

            <div class="slider-card-bottom">

              <span class="slider-card-price">
                ${money(e.price)}
              </span>

              <button
                type="button"
                class="slider-card-button"
                data-featured-event="${e.id}"
              >
                Xem chi tiết ↗
              </button>

            </div>

          </div>
        </article>
      `).join("");
    }

    // Tạo các chấm điều hướng
    featuredDots.innerHTML = Array.from(
      { length: pageCount },
      (_, i) => `
        <button
          type="button"
          class="slider-dot ${i === featuredPage ? "active" : ""}"
          data-slide-page="${i}"
          aria-label="Trang ${i + 1}"
          ${i === featuredPage ? 'aria-current="true"' : ""}
        ></button>
      `
    ).join("");

    // Ẩn nút điều hướng nếu chỉ có một trang
    $("#sliderPrev").hidden = pageCount <= 1;
    $("#sliderNext").hidden = pageCount <= 1;
  }

  // Chuyển trang slider
  function shiftFeatured(step) {
    featuredPage += step;
    renderFeatured();
  }

  // Tự động chuyển mỗi 5 giây
  function startFeaturedAuto() {
    clearInterval(featuredTimer);

    const enoughEvents =
      featuredEvents().length > featuredPerPage();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (enoughEvents && !reducedMotion) {
      featuredTimer = setInterval(() => {
        shiftFeatured(1);
      }, 5000);
    }
  }

  // Nút trái
  $("#sliderPrev").addEventListener("click", () => {
    shiftFeatured(-1);
    startFeaturedAuto();
  });

  // Nút phải
  $("#sliderNext").addEventListener("click", () => {
    shiftFeatured(1);
    startFeaturedAuto();
  });

  // Bấm chấm điều hướng
  featuredDots.addEventListener("click", ev => {
    const button = ev.target.closest("[data-slide-page]");

    if (!button) return;

    featuredPage = Number(button.dataset.slidePage);

    renderFeatured();
    startFeaturedAuto();
  });

  // Bấm poster hoặc nút xem chi tiết
  featuredTrack.addEventListener("click", ev => {
    const card = ev.target.closest(
      "[data-featured-event]"
    );

    if (!card) return;

    openEvent(card.dataset.featuredEvent);
  });

  // Hỗ trợ mở sự kiện bằng bàn phím
  featuredTrack.addEventListener("keydown", ev => {
    if (
      (ev.key === "Enter" || ev.key === " ") &&
      ev.target.matches(".slider-card")
    ) {
      ev.preventDefault();
      openEvent(ev.target.dataset.featuredEvent);
    }
  });

  // Dừng tự chạy khi rê chuột vào slider
  featuredSlider.addEventListener("mouseenter", () => {
    clearInterval(featuredTimer);
  });

  // Chạy tiếp khi rời chuột
  featuredSlider.addEventListener(
    "mouseleave",
    startFeaturedAuto
  );

  // Dừng khi đang thao tác bằng bàn phím
  featuredSlider.addEventListener("focusin", () => {
    clearInterval(featuredTimer);
  });

  featuredSlider.addEventListener("focusout", ev => {
    if (!featuredSlider.contains(ev.relatedTarget)) {
      startFeaturedAuto();
    }
  });

  // Cập nhật khi đổi kích thước màn hình
  let previousPerPage = featuredPerPage();

  window.addEventListener("resize", () => {
    const nextPerPage = featuredPerPage();

    if (nextPerPage !== previousPerPage) {
      featuredPage = 0;
      previousPerPage = nextPerPage;

      renderFeatured();
      startFeaturedAuto();
    }
  });

  // =========================================
  // HEADER SEARCH
  // =========================================

  const headerSearchInput = $("#headerSearchInput");
  const mainSearchInput = $("#searchInput");

  // Gõ ở header -> lọc sự kiện
  headerSearchInput.addEventListener("input", () => {
    mainSearchInput.value = headerSearchInput.value;
    renderEvents();
  });

  // Gõ ở bộ lọc -> đồng bộ header
  mainSearchInput.addEventListener("input", () => {
    headerSearchInput.value = mainSearchInput.value;
  });

  // Enter trong ô tìm kiếm header
  headerSearchInput.addEventListener("keydown", ev => {
    if (ev.key !== "Enter") return;

    ev.preventDefault();

    mainSearchInput.value = headerSearchInput.value;
    renderEvents();

    location.hash = "#events";

    $("#events").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  // Nút tìm kiếm trên header
  $("#searchShortcut").addEventListener("click", () => {
    headerSearchInput.focus();
  });

  // =========================================
  // HOME CATEGORY LINKS
  // =========================================

  

$$("[data-home-category]").forEach(link => {
  link.addEventListener("click", () => {
    const category = link.dataset.homeCategory;

    // Lưu thể loại đã chọn
    activeCategory = category;

    // Đồng bộ dropdown thể loại
    $("#genreFilter").value = category;

    // Lọc lại danh sách sự kiện
    renderEvents();
  });
});

// =========================================
// INITIALIZE
// =========================================

  renderFeatured();
  startFeaturedAuto();

  renderEvents();
  renderArtists();

  if (user) {
    $("#accountButton").textContent = "Tài khoản";
  }

  routeHash();

})();

