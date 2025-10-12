
import React, { useState } from 'react';
import type { OrderItem, MenuItem } from '../types';

interface OrderSectionProps {
    orderItems: OrderItem[];
    totalAmount: number;
    menuItems: MenuItem[];
    onAddItem: (item: MenuItem) => void;
    onUpdateQuantity: (itemId: number, newQuantity: number) => void;
    onRemoveItem: (itemId: number) => void;
    onFormSubmit: (formData: any) => Promise<{success: boolean, message: string}>;
}

const getDefaultPickupTime = () => {
    const defaultPickupTime = new Date();
    defaultPickupTime.setMinutes(defaultPickupTime.getMinutes() + 30);
    return defaultPickupTime.toISOString().slice(0, 16);
};

const OrderSection: React.FC<OrderSectionProps> = ({ orderItems, totalAmount, menuItems, onAddItem, onUpdateQuantity, onRemoveItem, onFormSubmit }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        pickupTime: getDefaultPickupTime(),
        notes: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const handleMenuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = parseInt(e.target.value, 10);
        if (!selectedId) return;
        const selectedItem = menuItems.find(item => item.id === selectedId);
        if (selectedItem) {
            onAddItem(selectedItem);
        }
        e.target.value = ""; // Reset dropdown after selection
    };
    
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.customerName.trim()) newErrors.customerName = '請輸入您的姓名';
        if (!/^09\d{8}$/.test(formData.customerPhone)) newErrors.customerPhone = '請輸入有效的手機號碼 (09開頭的10位數字)';
        if (!formData.pickupTime) newErrors.pickupTime = '請選擇取餐時間';
        
        setErrors(newErrors);
        
        if (orderItems.length === 0) {
            setFormError('請至少選擇一項餐點');
            return false;
        }

        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (name === 'customerPhone' && value && !/^09\d{0,8}$/.test(value)) {
             setErrors(prev => ({ ...prev, [name]: '手機號碼格式不正確' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!validate()) {
            return;
        }
        setIsLoading(true);
        const result = await onFormSubmit(formData);
        setIsLoading(false);
        if (result.success) {
            setFormData({
                customerName: '',
                customerPhone: '',
                pickupTime: getDefaultPickupTime(),
                notes: ''
            });
            setErrors({});
        } else {
            setFormError(result.message);
        }
    };

    return (
        <section id="order" className="py-16 bg-neutral">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">線上訂餐</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">填寫您的訂單資訊，快速又方便</p>
                </div>
                <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-lg">
                    <form onSubmit={handleSubmit} noValidate className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="customerName">顧客姓名 <span className="text-red-500">*</span></label>
                            <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"/>
                            {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="customerPhone">聯絡電話 <span className="text-red-500">*</span></label>
                            <input type="tel" id="customerPhone" name="customerPhone" value={formData.customerPhone} onChange={handleChange} required pattern="09\d{8}" placeholder="0912345678" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"/>
                            {errors.customerPhone && <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="pickupTime">取餐時間 <span className="text-red-500">*</span></label>
                            <input type="datetime-local" id="pickupTime" name="pickupTime" value={formData.pickupTime} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"/>
                            {errors.pickupTime && <p className="text-red-500 text-sm mt-1">{errors.pickupTime}</p>}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3 text-dark">🍽️ 菜單選擇</h3>
                            <select onChange={handleMenuSelect} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition">
                                <option value="">請選擇餐點...</option>
                                {menuItems.map(item => <option key={item.id} value={item.id}>{item.emoji} {item.name} - ${item.price}</option>)}
                            </select>

                            <div className="mt-4 space-y-3">
                                {orderItems.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">尚未選擇任何餐點</p>
                                ) : orderItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                                        <div>
                                            <p className="font-medium text-sm md:text-base">{item.emoji} {item.name}</p>
                                            <p className="text-sm text-gray-500">${item.price} x {item.quantity} = ${item.price * item.quantity}</p>
                                        </div>
                                        <div className="flex items-center space-x-1 md:space-x-2">
                                            <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">-</button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">+</button>
                                            <button type="button" onClick={() => onRemoveItem(item.id)} className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors">×</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="notes">訂單備註 (選填)</label>
                            <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} placeholder="如有特殊需求請在此備註..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"></textarea>
                        </div>
                        
                        <div className="bg-green-50/50 border border-green-200/80 p-4 rounded-lg text-lg font-bold flex justify-between items-center">
                            <span className="text-green-800">💰 總金額:</span>
                            <span className="text-green-800">${totalAmount}</span>
                        </div>
                        
                        <button type="submit" className="w-full bg-primary text-white py-3 px-6 rounded-full font-medium transition-all duration-300 hover:bg-primary/90 hover:shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-50" disabled={isLoading || orderItems.length === 0}>
                            {isLoading ? (
                                <i className="fa fa-circle-o-notch fa-spin text-xl"></i>
                            ) : (
                                <><i className="fa fa-paper-plane mr-2"></i> 送出訂單</>
                            )}
                        </button>
                        
                        {formError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                                <i className="fa fa-exclamation-circle mr-2"></i>
                                <span>{formError}</span>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default OrderSection;
