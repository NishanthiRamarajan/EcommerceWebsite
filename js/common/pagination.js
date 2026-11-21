/* pagination.js - reusable client-side pagination: First, Previous, page numbers, Next, Last, records per page.
   var pg = new Paginator({ container:"#pager", perPage:10, onPage:function(items,start){ ...draw rows... } });
   pg.setItems(array);   // draws page 1
   Later (Firebase query paging): replace slice() with limitToFirst/startAt requests - see docs/LIMITATIONS.md */
function Paginator(opts) {
  const self = this;
  this.$box = $(opts.container);
  this.perPage = opts.perPage || 10;
  this.onPage = opts.onPage;
  this.onSize = opts.onSize;
  this.items = [];
  this.page = 1;
  this.$box.on("click", "[data-page]", function () { if (!$(this).prop("disabled")) self.go(parseInt($(this).attr("data-page"), 10)); });
  this.$box.on("change", ".pg-size", function () { self.perPage = parseInt($(this).val(), 10); if (self.onSize) self.onSize(self.perPage); self.page = 1; self.render(); });
}
Paginator.prototype.pages = function () { return Math.max(1, Math.ceil(this.items.length / this.perPage)); };
Paginator.prototype.setItems = function (items, keepPage) { this.items = items; if (!keepPage) this.page = 1; this.render(); };
Paginator.prototype.go = function (p) { this.page = Math.min(Math.max(1, p), this.pages()); this.render(); };
Paginator.prototype.render = function () {
  const total = this.items.length, pages = this.pages();
  if (this.page > pages) this.page = pages;
  const start = (this.page - 1) * this.perPage;
  this.onPage(this.items.slice(start, start + this.perPage), start);

  if (total === 0) { this.$box.empty(); return; }
  const from = start + 1, to = Math.min(start + this.perPage, total);
  let lo = Math.max(1, this.page - 2), hi = Math.min(pages, lo + 4);
  lo = Math.max(1, hi - 4);
  let nums = "";
  for (let i = lo; i <= hi; i++) nums += '<button type="button" class="pg-btn' + (i === this.page ? " on" : "") + '" data-page="' + i + '">' + i + "</button>";
  const dis = function (c) { return c ? " disabled" : ""; };
  let sizes = "";
  APP.PAGE_SIZES.forEach(function (n) { sizes += '<option value="' + n + '"' + (n === this.perPage ? " selected" : "") + ">" + n + "</option>"; }, this);
  this.$box.html(
    '<span class="pg-info">Showing ' + from + "-" + to + " of " + total + "</span>" +
    '<span class="pg-ctrl"><button type="button" class="pg-btn" data-page="1"' + dis(this.page === 1) + ">First</button>" +
    '<button type="button" class="pg-btn" data-page="' + (this.page - 1) + '"' + dis(this.page === 1) + ">Previous</button>" + nums +
    '<button type="button" class="pg-btn" data-page="' + (this.page + 1) + '"' + dis(this.page === pages) + ">Next</button>" +
    '<button type="button" class="pg-btn" data-page="' + pages + '"' + dis(this.page === pages) + ">Last</button></span>" +
    '<label class="pg-size-l">Per page <select class="pg-size">' + sizes + "</select></label>");
};
