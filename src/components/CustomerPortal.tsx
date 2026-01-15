import { useState } from "react";
import { ShoppingCart, Search, Filter, Heart, Star, Package } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  available: boolean;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
}

const mockProducts: Product[] = [
  {
    id: 'P-001',
    name: 'Aluminum Scaffolding Frame - 6ft',
    category: 'Frames',
    price: 85,
    rating: 4.5,
    reviews: 24,
    available: true,
    image: ''
  },
  {
    id: 'P-002',
    name: 'Steel Platform Board',
    category: 'Platforms',
    price: 45,
    rating: 4.8,
    reviews: 38,
    available: true,
    image: ''
  },
  {
    id: 'P-003',
    name: 'Safety Guard Rail Set',
    category: 'Safety',
    price: 65,
    rating: 4.6,
    reviews: 15,
    available: true,
    image: ''
  },
  {
    id: 'P-004',
    name: 'Scaffold Caster Wheels',
    category: 'Accessories',
    price: 25,
    rating: 4.3,
    reviews: 42,
    available: false,
    image: ''
  },
];

export function CustomerPortal() {
  const [products] = useState<Product[]>(mockProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success("Added to cart!");
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.success("Removed from cart");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.id === productId ? { ...item, quantity } : item
    ));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    toast.success("Order placed successfully!");
    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Scaffolding Marketplace</h1>
          <p className="text-[#374151]">Browse and rent scaffolding equipment</p>
        </div>
        <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] relative">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart ({cartCount})
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Shopping Cart</DialogTitle>
              <DialogDescription>
                Review your selected items
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-[#9CA3AF] mx-auto mb-3" />
                  <p className="text-[#6B7280]">Your cart is empty</p>
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-[#F3F4F6] rounded flex items-center justify-center">
                        <Package className="h-8 w-8 text-[#9CA3AF]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[#111827]">{item.name}</h4>
                        <p className="text-[14px] text-[#6B7280]">RM{item.price}/day</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-[#111827] w-24 text-right">RM{item.price * item.quantity}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <span className="text-[#DC2626]">×</span>
                      </Button>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-[18px] mb-4">
                      <span className="text-[#111827]">Total</span>
                      <span className="text-[#111827]">RM{cartTotal}/day</span>
                    </div>
                    <Button 
                      className="w-full bg-[#1E40AF] hover:bg-[#1E3A8A]"
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                      }}
                    >
                      Proceed to Checkout
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search scaffolding equipment..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Frames">Frames</SelectItem>
            <SelectItem value="Platforms">Platforms</SelectItem>
            <SelectItem value="Safety">Safety</SelectItem>
            <SelectItem value="Accessories">Accessories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="border-[#E5E7EB] hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="aspect-square bg-[#F3F4F6] rounded-t-lg flex items-center justify-center relative">
                <Package className="h-20 w-20 text-[#9CA3AF]" />
                <button className="absolute top-3 right-3 p-2 bg-white rounded-full hover:bg-[#F3F4F6]">
                  <Heart className="h-4 w-4 text-[#6B7280]" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-[#111827] mb-1">{product.name}</h3>
                  <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                    {product.category}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 text-[14px]">
                  <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                  <span className="text-[#111827]">{product.rating}</span>
                  <span className="text-[#6B7280]">({product.reviews} reviews)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[20px] text-[#111827]">RM{product.price}</p>
                    <p className="text-[12px] text-[#6B7280]">per day</p>
                  </div>
                  {product.available ? (
                    <Badge className="bg-[#059669] hover:bg-[#047857]">Available</Badge>
                  ) : (
                    <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Out of Stock</Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedProduct(product)}
                  >
                    View Details
                  </Button>
                  <Button 
                    className="flex-1 bg-[#1E40AF] hover:bg-[#1E3A8A]"
                    disabled={!product.available}
                    onClick={() => addToCart(product)}
                  >
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete your order
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rentalPeriod">Rental Period (Days)</Label>
              <Input id="rentalPeriod" type="number" defaultValue="30" className="h-10" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea 
                id="deliveryAddress"
                placeholder="Enter delivery address"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDetails">Project Details</Label>
              <Textarea 
                id="projectDetails"
                placeholder="Describe your project..."
                className="min-h-[80px]"
              />
            </div>

            <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#6B7280]">Subtotal (30 days)</span>
                  <span className="text-[#111827]">RM{cartTotal * 30}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#6B7280]">Delivery</span>
                  <span className="text-[#111827]">RM150</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#6B7280]">Deposit (50%)</span>
                  <span className="text-[#111827]">RM{(cartTotal * 30 + 150) * 0.5}</span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between">
                  <span className="text-[#111827]">Total Due</span>
                  <span className="text-[#111827]">RM{(cartTotal * 30 + 150) * 0.5}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1 bg-[#1E40AF] hover:bg-[#1E3A8A]" onClick={handleCheckout}>
                Place Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}