exports.calculatePrice = (req, res) => {
    try {
        const { serviceType, distanceKm, surgeFactor = 1.0 } = req.body;
        const basePrices = { bike: 5000, car: 12000, luxury: 20000 };
        const basePricePerKm = basePrices[serviceType] || 12000;
        const totalPrice = Math.round(basePricePerKm * distanceKm * surgeFactor);

        res.status(200).json({
            success: true,
            data: { serviceType, distanceKm, totalPrice, currency: "VND" }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};