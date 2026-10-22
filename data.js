// Dữ liệu demo cho ticketbox. Có thể thay bằng dữ liệu thật của nhóm.
window.TT_SEED_EVENTS = [
 {id:"ev001",title:"NEON NIGHTS — Music Festival",genre:"Festival",location:"Hà Nội",venue:"Công viên Yên Sở",date:"2026-11-21",time:"18:30",price:450000,free:false,status:"upcoming",organizer:"True Live",artistIds:["ar001","ar002"],image:"https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=85",description:"Một đêm hội tụ âm nhạc điện tử, ánh sáng và những màn trình diễn bùng nổ. Hãy sẵn sàng cho trải nghiệm âm nhạc ngoài trời khó quên.",
ticketTypes: [
  {
    id: "svip",
    name: "SVIP",
    price: 3500000,
    quantity: 80,
    seated: false
  },
  {
    id: "vip-a",
    name: "VIP A",
    price: 2800000,
    quantity: 120,
    seated: false
  },
  {
    id: "vip-b",
    name: "VIP B",
    price: 2400000,
    quantity: 120,
    seated: false
  },
  {
    id: "zone-a",
    name: "Khu A",
    price: 1600000,
    quantity: 200,
    seated: false
  },
  {
    id: "zone-b",
    name: "Khu B",
    price: 1200000,
    quantity: 250,
    seated: false
  },
  {
    id: "zone-c",
    name: "Khu C",
    price: 850000,
    quantity: 300,
    seated: false
  }
]
},
 {id:"ev002",title:"The Sound of Us",genre:"Âm nhạc",location:"TP. Hồ Chí Minh",venue:"Nhà thi đấu Phú Thọ",date:"2026-11-28",time:"19:00",price:650000,free:false,status:"upcoming",organizer:"Mellow Production",artistIds:["ar001","ar003"],image:"https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85",description:"Live concert dành cho những giai điệu gắn kết chúng ta. Không gian sân khấu được thiết kế riêng cho một đêm nhạc nhiều cảm xúc.",ticketTypes:[{id:"standard",name:"Standard",price:650000,quantity:400,seated:true},{id:"premium",name:"Premium Seat",price:1200000,quantity:100,seated:true}]},
 {id:"ev003",title:"Creative Minds Workshop",genre:"Workshop",location:"Hà Nội",venue:"Complex 01, Tây Hồ",date:"2026-11-07",time:"09:00",price:0,free:true,status:"upcoming",organizer:"The Makers Lab",artistIds:["ar004"],image:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85",description:"Một buổi gặp gỡ dành cho những người yêu sáng tạo, chia sẻ ý tưởng, thử nghiệm và kết nối cộng đồng.",ticketTypes:[{id:"free",name:"Vé tham dự",price:0,quantity:80,seated:false}]},
 {id:"ev004",title:"MIDNIGHT: Indie Sessions",genre:"Âm nhạc",location:"Đà Nẵng",venue:"The Workshop Da Nang",date:"2026-12-05",time:"20:00",price:280000,free:false,status:"upcoming",organizer:"Midnight Club",artistIds:["ar002","ar003"],image:"https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85",description:"Một sân khấu nhỏ cho những âm thanh lớn. Tận hưởng đêm nhạc indie trong không gian gần gũi và giàu năng lượng.",ticketTypes:[{id:"entry",name:"Early Entry",price:280000,quantity:250,seated:false},{id:"backstage",name:"Backstage",price:600000,quantity:40,seated:false}]},
 {id:"ev005",title:"Art After Dark",genre:"Nghệ thuật",location:"TP. Hồ Chí Minh",venue:"The Factory Contemporary Arts Centre",date:"2026-11-14",time:"17:00",price:150000,free:false,status:"upcoming",organizer:"Art House",artistIds:["ar004"],image:"https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85",description:"Triển lãm và trải nghiệm nghệ thuật đương đại trong một không gian mở, nơi người xem có thể khám phá nhiều góc nhìn mới.",ticketTypes:[{id:"standard",name:"Standard Entry",price:150000,quantity:300,seated:false}]},
 {id:"ev006",title:"Run The City 2026",genre:"Thể thao",location:"Hà Nội",venue:"Phố đi bộ Hồ Gươm",date:"2026-12-13",time:"05:30",price:120000,free:false,status:"upcoming",organizer:"City Run",artistIds:[],image:"https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=900&q=85",description:"Sự kiện chạy bộ cộng đồng kết nối những người yêu vận động và khám phá thành phố theo một cách mới.",ticketTypes:[{id:"runner",name:"Runner Kit",price:120000,quantity:1000,seated:false}]},
 {id:"ev007",title:"Sunset Sessions",genre:"Festival",location:"Đà Nẵng",venue:"Bãi biển Mỹ Khê",date:"2026-10-03",time:"16:30",price:350000,free:false,status:"ended",organizer:"True Live",artistIds:["ar001"],image:"https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85",description:"Sự kiện đã kết thúc. Cảm ơn bạn đã cùng tạo nên một mùa âm nhạc đáng nhớ.",ticketTypes:[{id:"ga",name:"General Admission",price:350000,quantity:300,seated:false}]},
 {id:"ev008",title:"Open Mic Community",genre:"Âm nhạc",location:"Hà Nội",venue:"Tranquil Books & Coffee",date:"2026-10-17",time:"19:30",price:0,free:true,status:"upcoming",organizer:"Open Mic Hanoi",artistIds:["ar003"],image:"https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85",description:"Một sân chơi gần gũi để chia sẻ âm nhạc, gặp gỡ người mới và tận hưởng những tiết mục mộc mạc.",ticketTypes:[{id:"free",name:"Vé tham dự",price:0,quantity:50,seated:false}]}
];
window.TT_SEED_ARTISTS = [
 {id:"ar001",name:"Sơn Tùng MTP",role:"Ca sĩ",image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGac2eKSXYomsyaKOTmrERFASxVFQsB202o0b_qvJLRfw6VW2NONGKdji256S9y9GHNK3W3y3GIVOBXtMjvAI0BpBJcI79dLf8i7gfGtFuRg&s=10",bio:"Giọng ca với màu sắc âm nhạc giàu cảm xúc.",eventIds:["ev001","ev002","ev007"]},
 {id:"ar002",name:"Chillies",role:"Ban nhạc",image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOnHocIBIRfMnnHf_yKKvL6onsWm8kj2QFawdMFS-ERg&s=10",bio:"Ban nhạc indie kết hợp âm thanh alternative và những câu chuyện đời thường.",eventIds:["ev001","ev004"]},
 {id:"ar003",name:"Hoàng Dũng",role:"Ca sĩ",image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRb5Vm9ZAidaCPf8JMh8Nxenw3Fyz6b3y_CmbPOdI0-oQ&s=10",bio:"Nghệ sĩ biểu diễn với set nhạc đa sắc màu.",eventIds:["ev002","ev004","ev008"]},
 {id:"ar004",name:"Trịnh Lữ",role:"Họa sĩ",image:"https://cdn2.tuoitre.vn/phunuonline/image/fckeditor/upload/2022/20220224/images/9926_san01672.jpg",bio:"'Vẽ gì cũng là tự họa'",eventIds:["ev003","ev005"]}
];
