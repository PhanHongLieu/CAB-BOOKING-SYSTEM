import React, { useState, useEffect } from 'react';
import PriceCard from '../components/PriceCard';

const Pricing = () => {
    // --- STATE QUẢN LÝ DỮ LIỆU ---
    const [distance, setDistance] = useState(1);
    const [surgeFactor, setSurgeFactor] = useState(1.0);
    const [selectedService, setSelectedService] = useState(null);
    
    // Thêm State mới để quản lý trạng thái đặt xe
    const [bookingStatus, setBookingStatus] = useState('idle'); // 'idle' | 'searching' | 'found'
    const [foundDriver, setFoundDriver] = useState(null);

    // Hàm tính tiền
    const calculatePrice = (basePrice) => {
        return Math.round(basePrice * distance * surgeFactor * 1000);
    };

    // Hàm xử lý khi bấm nút Đặt xe
    const handleBooking = () => {
        if (!selectedService) {
            alert("Vui lòng chọn một loại xe trước!");
            return;
        }

        // 1. Chuyển sang trạng thái đang tìm
        setBookingStatus('searching');

        // 2. Giả vờ đợi 3 giây (3000ms) rồi báo tìm thấy
        setTimeout(() => {
            setBookingStatus('found');
            
            // Random tên tài xế cho vui
            const drivers = ["Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Hùng D"];
            const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];
            
            setFoundDriver({
                name: randomDriver,
                plate: "59-" + Math.floor(1000 + Math.random() * 9000), // Biển số ngẫu nhiên
                phone: "0909***888",
                rating: "4.9 ⭐"
            });
        }, 3000); 
    };

    // Hàm để Reset lại từ đầu
    const resetBooking = () => {
        setBookingStatus('idle');
        setSelectedService(null);
        setFoundDriver(null);
    };

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h1 className="fw-bold text-primary">🚖 Đặt Xe Nhanh</h1>
                <p className="text-muted">Trải nghiệm dịch vụ đặt xe 5 sao</p>
            </div>

            {/* --- KHU VỰC NHẬP LIỆU (Chỉ hiện khi chưa tìm xe) --- */}
            {bookingStatus === 'idle' && (
                <div className="row justify-content-center mb-5">
                    <div className="col-md-6">
                        <div className="card shadow-sm border-0 bg-light">
                            <div className="card-body p-4">
                                <label className="form-label fw-bold">📍 Khoảng cách (Km):</label>
                                <div className="input-group mb-3">
                                    <input 
                                        type="number" 
                                        className="form-control form-control-lg" 
                                        value={distance} 
                                        onChange={(e) => setDistance(e.target.value)} 
                                        min="1"
                                    />
                                    <span className="input-group-text">km</span>
                                </div>
                                
                                <div className="form-check form-switch d-flex align-items-center gap-2">
                                    <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        style={{width: '3em', height: '1.5em'}}
                                        onChange={(e) => setSurgeFactor(e.target.checked ? 1.5 : 1.0)} 
                                    />
                                    <label className="form-check-label text-danger fw-bold">
                                        {surgeFactor > 1 ? '🔥 Giá cao điểm (x1.5)' : 'Chế độ thường'}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- KHU VỰC HIỂN THỊ DANH SÁCH XE (Chỉ hiện khi chưa tìm) --- */}
            {bookingStatus === 'idle' && (
                <>
                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <PriceCard id="bike" icon="🛵" serviceName="Cab Bike" desc="Nhanh gọn lẹ"
                                basePrice={5} isSurge={surgeFactor > 1} surgeFactor={surgeFactor} 
                                totalPrice={calculatePrice(5)} isSelected={selectedService === 'bike'} onSelect={setSelectedService} color="success" 
                            />
                        </div>
                        <div className="col-md-4">
                            <PriceCard id="standard" icon="🚖" serviceName="Cab Standard" desc="4 chỗ tiện lợi"
                                basePrice={12} isSurge={surgeFactor > 1} surgeFactor={surgeFactor} 
                                totalPrice={calculatePrice(12)} isSelected={selectedService === 'standard'} onSelect={setSelectedService} color="primary" 
                            />
                        </div>
                        <div className="col-md-4">
                            <PriceCard id="luxury" icon="🚘" serviceName="Cab Luxury" desc="Sang trọng VIP"
                                basePrice={20} isSurge={surgeFactor > 1} surgeFactor={surgeFactor} 
                                totalPrice={calculatePrice(20)} isSelected={selectedService === 'luxury'} onSelect={setSelectedService} color="warning" 
                            />
                        </div>
                    </div>

                    {/* NÚT ĐẶT XE TO ĐÙNG */}
                    <div className="text-center mt-4">
                        <button 
                            className="btn btn-primary btn-lg px-5 py-3 fw-bold rounded-pill shadow"
                            onClick={handleBooking}
                            disabled={!selectedService}
                        >
                            {selectedService ? '🚀 TÌM TÀI XẾ NGAY' : '👇 Chọn loại xe ở trên'}
                        </button>
                    </div>
                </>
            )}

            {/* --- MÀN HÌNH 2: ĐANG TÌM TÀI XẾ (Loading) --- */}
            {bookingStatus === 'searching' && (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" style={{width: '5rem', height: '5rem'}} role="status"></div>
                    <h2 className="mt-4 animate-pulse">📡 Đang kết nối với tài xế gần nhất...</h2>
                    <p className="text-muted">Vui lòng đợi trong giây lát</p>
                </div>
            )}

            {/* --- MÀN HÌNH 3: ĐÃ TÌM THẤY (Success) --- */}
            {bookingStatus === 'found' && foundDriver && (
                <div className="row justify-content-center animate__animated animate__fadeInUp">
                    <div className="col-md-6">
                        <div className="card border-success shadow-lg">
                            <div className="card-header bg-success text-white text-center py-3">
                                <h3 className="mb-0">🎉 TÀI XẾ ĐÃ NHẬN CHUYẾN!</h3>
                            </div>
                            <div className="card-body text-center p-5">
                                <div className="display-1 mb-3">🚖</div>
                                <h2 className="fw-bold">{foundDriver.name}</h2>
                                <div className="badge bg-warning text-dark fs-5 mb-3">{foundDriver.rating}</div>
                                <hr />
                                <div className="row text-start mt-4">
                                    <div className="col-6">
                                        <p className="text-muted mb-1">Biển số xe:</p>
                                        <h4 className="fw-bold">{foundDriver.plate}</h4>
                                    </div>
                                    <div className="col-6">
                                        <p className="text-muted mb-1">Số điện thoại:</p>
                                        <h4 className="fw-bold">{foundDriver.phone}</h4>
                                    </div>
                                </div>
                                <div className="alert alert-info mt-4">
                                    Tài xế đang đến đón bạn trong 5 phút nữa.
                                </div>
                                <button className="btn btn-outline-secondary w-100 mt-3" onClick={resetBooking}>
                                    Đặt chuyến khác
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pricing;