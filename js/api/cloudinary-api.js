/* cloudinary-api.js - unsigned product image uploads; no API secret belongs in browser code. */
const CLOUDINARY_CONFIG = {
  cloudName: "e6m1pe7r",
  uploadPreset: "ecom_product_images"
};

const CloudinaryAPI = {
  upload: function (file) {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    return $.ajax({
      url: "https://api.cloudinary.com/v1_1/" + encodeURIComponent(CLOUDINARY_CONFIG.cloudName) + "/image/upload",
      method: "POST",
      data: data,
      processData: false,
      contentType: false,
      dataType: "json"
    }).then(function (result) {
      if (!result || typeof result.secure_url !== "string" || !/^https:\/\//i.test(result.secure_url)) {
        return $.Deferred().reject(new Error("Cloudinary did not return a secure image URL.")).promise();
      }
      return { imageUrl: result.secure_url };
    });
  }
};
