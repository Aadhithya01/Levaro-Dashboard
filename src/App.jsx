import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Categories from './pages/Categories'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Dashboard from './pages/Dashboard'
import Ledger from './pages/Ledger'
import Tasks from './pages/Tasks'
import Orders from './pages/Orders'
import CustomerOrders from './pages/CustomerOrders'
import Welcome from './pages/Welcome'
import CustomerShop from './pages/CustomerShop'
import CustomerCategory from './pages/CustomerCategory'
import SetPrices from './pages/SetPrices'
import DealOfTheDay from './pages/DealOfTheDay'
import CouponsAdmin from './pages/CouponsAdmin'
import DescriptionsAdmin from './pages/DescriptionsAdmin'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
      <Route path="/categories/:categoryId" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/customer-orders" element={<ProtectedRoute><CustomerOrders /></ProtectedRoute>} />
      <Route path="/set-prices" element={<ProtectedRoute><SetPrices /></ProtectedRoute>} />
      <Route path="/deals" element={<ProtectedRoute><DealOfTheDay /></ProtectedRoute>} />
      <Route path="/coupons" element={<ProtectedRoute><CouponsAdmin /></ProtectedRoute>} />
      <Route path="/descriptions" element={<ProtectedRoute><DescriptionsAdmin /></ProtectedRoute>} />
      <Route path="/shop" element={<CustomerShop />} />
      <Route path="/shop/:categoryId" element={<CustomerCategory />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
