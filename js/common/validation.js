/* validation.js - form validation. This is for user experience only; Firebase rules are the real protection. */
const Validate = {
  required: function (v) { return String(v == null ? "" : v).trim().length > 0; },
  email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); },
  mobile: function (v) { return /^[6-9]\d{9}$/.test(v); },            // 10-digit Indian mobile
  wholeNumber: function (v) { return /^\d+$/.test(String(v).trim()); },  // 0, 1, 2 ...

  registration: function (d) {
    const e = {};
    if (!Validate.required(d.name)) e.name = "Name is required."; else if (d.name.length < 2) e.name = "Name must be at least 2 characters.";
    if (!Validate.required(d.email)) e.email = "Email is required."; else if (!Validate.email(d.email)) e.email = "Enter a valid email address.";
    if (!Validate.required(d.mobile)) e.mobile = "Mobile number is required."; else if (!Validate.mobile(d.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
    if (!d.password) e.password = "Password is required."; else if (d.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!d.confirmPassword) e.confirmPassword = "Please confirm your password."; else if (d.password !== d.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  },
  login: function (d) {
    const e = {};
    if (!Validate.required(d.email)) e.email = "Email is required."; else if (!Validate.email(d.email)) e.email = "Enter a valid email address.";
    if (!d.password) e.password = "Password is required.";
    return e;
  },
  profile: function (d) {
    const e = {};
    if (!Validate.required(d.name) || d.name.length < 2) e.name = "Name must be at least 2 characters.";
    if (!Validate.mobile(d.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
    return e;
  },
  category: function (d, o) {
    const e = {};
    if (!o.isEdit) {
      if (!Validate.required(d.id)) e.id = "Category ID is required.";
      else if (!/^[A-Za-z0-9_-]{2,30}$/.test(d.id)) e.id = "Use 2-30 letters, numbers, - or _.";
      else if (o.existingIds.indexOf(d.id) > -1) e.id = "This Category ID already exists.";
    }
    if (!Validate.required(d.name)) e.name = "Category name is required."; else if (d.name.length > 60) e.name = "Maximum 60 characters.";
    return e;
  },
  product: function (d, o) {   // o: { isEdit, existingIds, categoryIds }
    const e = {};
    if (!o.isEdit) {
      if (!Validate.required(d.id)) e.id = "Product ID is required.";
      else if (!/^[A-Za-z0-9_-]{2,30}$/.test(d.id)) e.id = "Use 2-30 letters, numbers, - or _.";
      else if (o.existingIds.indexOf(d.id) > -1) e.id = "This Product ID already exists.";
    }
    if (!Validate.required(d.catId)) e.catId = "Choose a category."; else if (o.categoryIds.indexOf(d.catId) < 0) e.catId = "This category does not exist.";
    if (!Validate.required(d.title)) e.title = "Title is required."; else if (d.title.length > 120) e.title = "Maximum 120 characters.";
    if (d.description.length > 1000) e.description = "Maximum 1000 characters.";
    if (!Validate.wholeNumber(d.quantity)) e.quantity = "Quantity must be 0 or a positive whole number.";
    if (!Validate.wholeNumber(d.price) || parseInt(d.price, 10) <= 0) e.price = "Price must be a whole number greater than 0.";
    if (d.imageUrl && !/^https?:\/\/\S+$/i.test(d.imageUrl)) e.imageUrl = "Image URL must start with http:// or https://";
    return e;
  },
  creditLimit: function (v, used) {
    if (!Validate.wholeNumber(v)) return "Credit limit must be 0 or a positive whole number.";
    if (parseInt(v, 10) < used) return "Credit limit cannot be lower than the credit already used (" + Utils.money(used) + ").";
    return "";
  }
};
