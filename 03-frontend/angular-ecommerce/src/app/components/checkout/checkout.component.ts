import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Luv2ShopFormService } from '../../services/luv2-shop-form.service';
import { element } from 'protractor';
import { Country } from 'src/app/common/country';
import { State } from 'src/app/common/state';
import { Luv2ShopValidators } from 'src/app/validators/luv2-shop-validators';
import { CartService } from 'src/app/services/cart.service';
import { CheckoutService } from 'src/app/services/checkout.service';
import { Router } from '@angular/router';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { Purchase } from 'src/app/common/purchase';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  checkoutFromGroup: FormGroup;
  
  totalPrice: number = 0;
  totalQuantity: number = 0;

  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[] = [];

  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];

  constructor(private formBuilder: FormBuilder,
              private luv2ShopFormService: Luv2ShopFormService,
              private cartService: CartService,
              private checkoutService: CheckoutService,
              private router: Router) { }

  ngOnInit(): void {

    this.reviewCartDetails();

    this.checkoutFromGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        email: new FormControl('', 
                                [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')])
      }),
      shippingAddress: this.formBuilder.group({
        street: new FormControl('', [Validators.required, Validators.minLength(10), Luv2ShopValidators.notOnlyWhitespace]),
        city: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        zipCode: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
      }),
      billingAddress: this.formBuilder.group({
        street: new FormControl('', [Validators.required, Validators.minLength(10), Luv2ShopValidators.notOnlyWhitespace]),
        city: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        zipCode: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
      }),
      creditCard: this.formBuilder.group({
        cardType: new FormControl('', [Validators.required]),
        nameOnCard: new FormControl('', [Validators.required, Validators.minLength(2), Luv2ShopValidators.notOnlyWhitespace]),
        cardNumber: new FormControl('', [Validators.required, Validators.pattern('[0-9]{16}')]),
        securityCode: new FormControl('', [Validators.required, Validators.pattern('[0-9]{3}')]),
        expirationMonth: new FormControl('', [Validators.required]),
        expirationYear: new FormControl('', [Validators.required]),
      }),
    });

    const startMonth: number = new Date().getMonth() + 1;

    this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        this.creditCardMonths = data;
      }
    )

    this.luv2ShopFormService.getCreditCardYears().subscribe(
      data => {
        this.creditCardYears = data;
      }
    );

    // populate countries
    this.luv2ShopFormService.getCountries().subscribe(
      data => {
        this.countries = data;
      }
    )
  }

  onSubmit(){

    if(this.checkoutFromGroup.invalid) {
      this.checkoutFromGroup.markAllAsTouched();
      return;
    }

    // set up order
    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    // get cart items
    const cartItems = this.cartService.cartItems;

    // create order ıtems from cartitems
    let orderItems: OrderItem[] = cartItems.map(tempCartItem => new OrderItem(tempCartItem));

    // set up purchase
    let purchase = new Purchase();

    // populate purchase customer
    purchase.customer = this.checkoutFromGroup.controls['customer'].value;

    // populate purchase shipping address
    purchase.shippingAddress = this.checkoutFromGroup.controls['shippingAddress'].value;
    const shippingState: State = JSON.parse(JSON.stringify(purchase.shippingAddress.state));
    const shippingCountry: Country = JSON.parse(JSON.stringify(purchase.shippingAddress.country));
    purchase.shippingAddress.state = shippingState.name;
    purchase.shippingAddress.country = shippingCountry.name;

    // populate purhcase billing address
    purchase.billingAddress = this.checkoutFromGroup.controls['billingAddress'].value;
    const billingState: State = JSON.parse(JSON.stringify(purchase.billingAddress.state));
    const billingCountry: Country = JSON.parse(JSON.stringify(purchase.billingAddress.country));
    purchase.billingAddress.state = billingState.name;
    purchase.billingAddress.country = billingCountry.name;

    // populate purchase order and orderItems
    purchase.order = order;
    purchase.orderItems = orderItems;

    // call RestApi via CechkoutService
    this.checkoutService.placeOrder(purchase).subscribe({
        next: response => {
          alert(`Your order has been received.\nOrder tracking number: ${response.orderTrackingNumber}`);
          // reset cart
          this.resetCart();
        },
        error: err => {
          alert(`There was an error: ${err.message}`);
        },
      }
    );

  }

  get firstName(){ return this.checkoutFromGroup.get('customer.firstName'); }
  get lastName(){ return this.checkoutFromGroup.get('customer.lastName'); }
  get email(){ return this.checkoutFromGroup.get('customer.email'); }

  get shippingAddressStreet() { return this.checkoutFromGroup.get('shippingAddress.street'); }
  get shippingAddressCity()   { return this.checkoutFromGroup.get('shippingAddress.city'); }
  get shippingAddressState()  { return this.checkoutFromGroup.get('shippingAddress.state'); }
  get shippingAddressZipCode(){ return this.checkoutFromGroup.get('shippingAddress.zipCode'); }
  get shippingAddressCountry(){ return this.checkoutFromGroup.get('shippingAddress.country'); }


  get billingAddressStreet() { return this.checkoutFromGroup.get('billingAddress.street'); }
  get billingAddressCity()   { return this.checkoutFromGroup.get('billingAddress.city'); }
  get billingAddressState()  { return this.checkoutFromGroup.get('billingAddress.state'); }
  get billingAddressZipCode(){ return this.checkoutFromGroup.get('billingAddress.zipCode'); }
  get billingAddressCountry(){ return this.checkoutFromGroup.get('billingAddress.country'); }

  get creditCardType(){ return this.checkoutFromGroup.get('creditCard.cardType'); }
  get creditCardNameOnCard(){ return this.checkoutFromGroup.get('creditCard.nameOnCard'); }
  get creditCardNumber(){ return this.checkoutFromGroup.get('creditCard.cardNumber'); }
  get creditCardSecurityCode(){ return this.checkoutFromGroup.get('creditCard.securityCode'); }

  copyShippingAddressToBillingAddress(event){
    if(event.target.checked){
      this.checkoutFromGroup.controls.billingAddress
        .setValue(this.checkoutFromGroup.controls.shippingAddress.value);


      // bug fix code
      this.billingAddressStates = this.shippingAddressStates;
    }
    else{
      this.checkoutFromGroup.controls.billingAddress.reset();

      // bug fix
      this.billingAddressStates = [];
    }

  }

  resetCart(){
    // reset cart data
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);

    // reset the form
    this.checkoutFromGroup.reset();

    // navigate back to the products page
    this.router.navigateByUrl("/products");
  }

  handleMonthsAndYears(){
    const creditCardFormGroup = this.checkoutFromGroup.get('creditCard');

    const currentYear: number = new Date().getFullYear();
    const selectedYear: number= Number(creditCardFormGroup.value.expirationYear);

    // if the current year equals the selected year, then start with the current month

    let startMonth: number;

    if (currentYear === selectedYear ){
      startMonth = new Date().getMonth() + 1;
    }else{
      startMonth = 1;
    }

    this.luv2ShopFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        this.creditCardMonths = data;
      }
    )
  }

  getStates(formGroupName: string){
    const formGroup = this.checkoutFromGroup.get(formGroupName);

    const countryCode = formGroup.value.country.code;
    const countryName = formGroup.value.country.name;

    this.luv2ShopFormService.getStates(countryCode).subscribe(
      data => {
        if(formGroupName === 'shippingAddress'){
          this.shippingAddressStates = data;
        }else{
          this.billingAddressStates = data;
        }

        formGroup.get('state').setValue(data[0]);
      }
    )
    
  }

  reviewCartDetails(){
    // subscribe to cartService.totalQuantity
    this.cartService.totalQuantity.subscribe(
      totalQuantity => this.totalQuantity = totalQuantity
    );
    // subscribe to cartService.totalPrice
    this.cartService.totalPrice.subscribe(
      totalPrice => this.totalPrice = totalPrice
    );
  }
}
