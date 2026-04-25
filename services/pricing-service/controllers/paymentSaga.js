const EventEmitter = require('events');
const eventBus = new EventEmitter();

let driverWallet = 0;
let userBalance = 500000;

const processedTransactions = new Set();

console.log("🚀 Khởi động Hệ thống Saga Payment...");

// 1. Lắng nghe sự kiện: CHUYẾN ĐI KẾT THÚC
eventBus.on('RideFinished', async (rideData) => {
    
    // 🛡️ BƯỚC QUAN TRỌNG: KIỂM TRA NẠP TRÙNG (IDEMPOTENCY CHECK)
    if (processedTransactions.has(rideData.rideId)) {
        console.log(`\n⚠️ [IDEMPOTENCY CATCH] Phát hiện sự kiện trùng lặp! Chuyến đi ${rideData.rideId} đã được thanh toán. Bỏ qua để tránh trừ tiền 2 lần.`);
        return; // Dừng lại ngay, không làm gì cả
    }

    // Đánh dấu giao dịch này đã được đưa vào xử lý
    processedTransactions.add(rideData.rideId);

    console.log(`\n[EVENT] Nhận RideFinished: Bắt đầu trừ tiền chuyến đi ${rideData.rideId}`);
    
    try {
        if (userBalance >= rideData.amount) {
            userBalance -= rideData.amount;
            console.log(`✅ [PAYMENT] Trừ tiền khách hàng thành công: -${rideData.amount}đ`);
            eventBus.emit('PaymentSuccess', rideData);
        } else {
            throw new Error("Khách không đủ tiền");
        }
    } catch (error) {
        console.log(`❌ [PAYMENT] Lỗi: ${error.message}`);
        eventBus.emit('PaymentFailed', rideData);
    }
});


eventBus.on('PaymentSuccess', async (rideData) => {
    console.log(`[EVENT] Nhận PaymentSuccess: Chuyển tiền cho tài xế...`);
    
    // Giả lập lỗi hệ thống ví nếu ID tài xế là ERR-123
    if (rideData.driverId === 'ERR-123') {
        console.log(`❌ [WALLET] Hệ thống ví tài xế đang bảo trì! Không thể cộng tiền.`);
        eventBus.emit('WalletCreditFailed', rideData);
    } else {
        driverWallet += rideData.amount;
        console.log(`✅ [WALLET] Cộng tiền tài xế thành công! Số dư ví: ${driverWallet}đ`);
        console.log(`🎉 HOÀN TẤT GIAO DỊCH SAGA MƯỢT MÀ!`);
    }
});


eventBus.on('WalletCreditFailed', (rideData) => {
    console.log(`\n⚠️ [COMPENSATION] Kích hoạt quy trình bù đắp (Hoàn tiền)...`);
    userBalance += rideData.amount; 
    console.log(`✅ [REFUND] Đã hoàn lại ${rideData.amount}đ cho khách. Số dư khách: ${userBalance}đ`);
    console.log(`⚠️ Đánh dấu chuyến đi ${rideData.rideId} là PAYMENT_FAILED.`);
});

// test thử

// Test 1: Chạy suôn sẻ bình thường
eventBus.emit('RideFinished', { rideId: 'RIDE-001', amount: 50000, driverId: 'DRV-999' });

// Test 2: Thử gửi lại đúng chuyến RIDE-001 xem có bị trừ tiền 2 lần không? (Test chống nạp trùng)
setTimeout(() => {
    eventBus.emit('RideFinished', { rideId: 'RIDE-001', amount: 50000, driverId: 'DRV-999' });
}, 1000);

// Test 3: Lỗi ví tài xế -> Test bù đắp hoàn tiền
setTimeout(() => {
    eventBus.emit('RideFinished', { rideId: 'RIDE-002', amount: 100000, driverId: 'ERR-123' });
}, 2000);
