import React, { useState, useMemo, useEffect } from 'react';
import Navbar from './components/Navbar';
import Header from './components/Header';
import OrderSection from './components/OrderSection';
import Contact from './components/Contact';
import Footer from './components/Footer';
import SuccessModal from './components/SuccessModal';
import { MENU_ITEMS, APPS_SCRIPT_URL } from './constants';
import type { OrderItem, MenuItem } from './types';

// Add liff declaration for TypeScript
declare const liff: any;

interface FormData {
    customerName: string;
    customerPhone: string;
    pickupTime: string;
    notes: string;
}

const App: React.FC = () => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submittedOrderId, setSubmittedOrderId] = useState('');
    const [lineUserId, setLineUserId] = useState<string | null>(null);
    const [liffError, setLiffError] = useState<string | null>(null);
    const [isLiffInitializing, setIsLiffInitializing] = useState(true);
    
    useEffect(() => {
        const initializeLiff = async () => {
            // In a non-LINE environment, we can finish initialization quickly.
            if (typeof liff === 'undefined') {
                setTimeout(() => setIsLiffInitializing(false), 200); // Small delay for UX
                console.warn("LIFF SDK not found. App will function without LINE integration.");
                return;
            }

            try {
                await liff.init({ liffId: "2008274702-xD3Xd2M6" });

                if (liff.isInClient()) {
                    if (!liff.isLoggedIn()) {
                        // This will redirect the user, so the script will stop execution here
                        // for this session. No need to set the loading state to false.
                        liff.login();
                    } else {
                        // User is logged in, get profile and complete initialization.
                        const profile = await liff.getProfile();
                        setLineUserId(profile.userId);
                        setIsLiffInitializing(false);
                    }
                } else {
                    // Not in the LINE client, so we are done with LIFF setup.
                    setIsLiffInitializing(false);
                }
            } catch (error: any) {
                const errorMessage = error.message || 'An unknown error occurred.';
                console.error("LIFF logic failed:", error);
                if (typeof liff !== 'undefined' && liff.isInClient()) {
                    setLiffError(errorMessage);
                }
                // Stop initializing on error so the user can still use the form.
                setIsLiffInitializing(false);
            }
        };

        initializeLiff();
    }, []);
    
    const totalAmount = useMemo(() => {
        return orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [orderItems]);

    const handleAddItem = (menuItem: MenuItem) => {
        setOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === menuItem.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...menuItem, quantity: 1 }];
        });
    };

    const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveItem(itemId);
        } else {
            setOrderItems(prevItems => prevItems.map(item =>
                item.id === itemId ? { ...item, quantity: newQuantity } : item
            ));
        }
    };
    
    const handleRemoveItem = (itemId: number) => {
        setOrderItems(prevItems => prevItems.filter(item => item.id !== itemId));
    };
    
    const handleFormSubmit = async (formData: FormData): Promise<{success: boolean, message: string}> => {
        const pickupDate = new Date(formData.pickupTime);
        const formattedPickupTime = `${pickupDate.getFullYear()}-${(pickupDate.getMonth() + 1).toString().padStart(2, '0')}-${pickupDate.getDate().toString().padStart(2, '0')} ${pickupDate.getHours().toString().padStart(2, '0')}:${pickupDate.getMinutes().toString().padStart(2, '0')}`;

        const orderData = {
            source: "line_web_app",
            customerName: formData.customerName,
            customerPhone: formData.customerPhone,
            customerLineId: lineUserId || '無',
            items: orderItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount: totalAmount,
            pickupTime: formattedPickupTime,
            notes: formData.notes || '無',
            orderFormat: "web",
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(orderData),
                mode: 'cors',
            });
            
            const responseText = await response.text();
            const result = JSON.parse(responseText);

            if (result.status === 'success') {
                setSubmittedOrderId(result.orderId || `ORD-${Date.now()}`);
                setIsModalOpen(true);
                setOrderItems([]);
                return { success: true, message: 'Order submitted successfully!' };
            } else {
                return { success: false, message: result.message || 'Server returned an error.' };
            }

        } catch (error) {
            console.error('Order submission error:', error);
            let errorMessage = 'Order submission failed. Please try again later.';
            if (error instanceof Error) {
                if (error.message.includes('CORS') || error.message.includes('Network')) {
                    errorMessage = 'Network connection issue. Please check your connection and try again.';
                } else if(error.message.includes('JSON')) {
                    errorMessage = 'Failed to parse server response. Please contact support.';
                }
            }
            return { success: false, message: errorMessage };
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSubmittedOrderId('');
    };

    return (
        <>
            {liffError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 fixed top-4 left-4 right-4 z-[100] shadow-lg rounded-md" role="alert">
                    <p className="font-bold">LIFF 連線錯誤</p>
                    <p className="mb-2 text-sm">請檢查您的 LIFF 設定，這將導致無法獲取 LINE 用戶資訊。</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        <li>
                            確認程式碼中的 <strong>LIFF ID</strong> 是否正確 (它位於 LINE Developers Console 的 "LIFF" 分頁中，<strong>不是 Channel ID</strong>)。
                        </li>
                        <li>
                            確認 LIFF 應用程式的狀態是否為 <strong>Published</strong>。
                        </li>
                        <li>
                            確認 LIFF 設定中的 <strong>Endpoint URL</strong> 是否與此網頁的網址完全相符。
                        </li>
                    </ul>
                    <p className="text-xs mt-2 text-red-900 bg-red-200 p-2 rounded">
                        <strong>技術錯誤訊息:</strong> {liffError}
                    </p>
                </div>
            )}
            <Navbar />
            <main>
                <Header />
                <OrderSection
                    orderItems={orderItems}
                    totalAmount={totalAmount}
                    menuItems={MENU_ITEMS}
                    onAddItem={handleAddItem}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onFormSubmit={handleFormSubmit}
                    isInitializing={isLiffInitializing}
                />
                <Contact />
            </main>
            <Footer />
            <SuccessModal 
                isOpen={isModalOpen}
                orderId={submittedOrderId}
                onClose={closeModal}
            />
        </>
    );
};

export default App;
