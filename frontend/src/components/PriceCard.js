import React from 'react';

const PriceCard = ({ id, icon, serviceName, basePrice, isSurge, surgeFactor, totalPrice, isSelected, onSelect }) => {
    return (
        <div 
            className={`card p-3 cursor-pointer ${isSelected ? 'border-primary bg-light' : ''}`} 
            onClick={() => onSelect(id)}
            style={{ cursor: 'pointer' }}
        >
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="mb-1">{icon} {serviceName}</h5>
                    <small className="text-muted">Giá gốc: {basePrice}k/km</small>
                    {isSurge && (
                        <div className="text-danger small">
                            ⚡ Surge x{surgeFactor}
                        </div>
                    )}
                </div>
                <div className="text-end">
                    <h4 className="mb-0 text-primary">{totalPrice.toLocaleString()} đ</h4>
                    <button className={`btn btn-sm mt-2 ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}>
                        {isSelected ? 'Đã chọn' : 'Chọn xe'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PriceCard;