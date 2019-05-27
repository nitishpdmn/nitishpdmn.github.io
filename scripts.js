"use strict";
var scripts = scripts || {};
scripts = function() {
	var ths = {};
	ths.secExpander = [];
	// [count == 0] iff [all things are open] iff ["Collapse section" state]
	ths.secCount = [];

	ths.begin = function() {
		// for image loading size
		ths.pxRatio = window.devicePixelRatio;
		ths.resourceRatio = window.devicePixelRatio;
		if (!ths.pxRatio) {
			ths.pxRatio = 1;
		}
		if (!ths.resourceRatio || ths.resourceRatio < 1.25) {
			ths.resourceRatio = 1;
		} else if (ths.resourceRatio < 1.75) {
			ths.resourceRatio = 1.5;
		} else {
			ths.resourceRatio = 2;
		}
		ths.roundedRatio = ths.resourceRatio;
		ths.resourceRatio = ths.resourceRatio + "x";

		/// convert email to better format
		var emails = document.getElementsByClassName("email");
		for (var i = emails.length - 1; i >= 0; i--) {
			emails[i].innerHTML = emails[i].innerHTML.replace(
				" [at] ", "@").replace(" [dot] ", ".");
		}

		// enable navbar transitions
		ths.navbar = document.getElementsByClassName("navbar")[0];
		setTimeout(function() {
			ths.navbar.classList.add("transitions");
		}, 100);

		// add filtering functionality
		ths.filterButton = ths.navbar.getElementsByClassName("filter-button")[0];
		ths.filterButton.classList.remove("disabled");
		ths.filterSelects = ths.navbar.getElementsByClassName("filter-selects")[0];
		ths.filterSelects.classList.remove("disabled");
		ths.filterButton.onclick = ths.toggleFiltering;
		ths.filterChooser = document.getElementById("filter_chooser");
		ths.filterChooser.onchange = ths.updateFilterType;
		ths.initializeFilter("data-year", "Year", true);
		ths.initializeFilter("data-journal", "Journal/Conference");

		// add element for dynamic border
		ths.navBorder = document.createElement("div");
		ths.navBorder.className = "dynamic-border";
		ths.navbar.appendChild(ths.navBorder);
		ths.addDynamicBorderTargets();

		/// make the open/close functions, per section
		var sections = document.getElementsByClassName("section");
		ths.secExpander.length = sections.length;
		ths.secCount.length = sections.length;
		for (i = sections.length - 1; i >= 0; i--) {
			// create the expand/collapse all
			ths.secExpander[i] = document.createElement("div");
			ths.secExpander[i].className = "expandsec";
			ths.secExpander[i].innerHTML = "<span>\uf065</span>";
			sections[i].appendChild(ths.secExpander[i]);
			ths.secExpander[i].onclick = ths.expandAll(i);

			let sectitle = sections[i].getElementsByTagName("h1")[0];
			setTimeout(function() {
				sectitle.classList.add("transitions");
			}, 100);

			// get pubs in section
			var pubs = sections[i].getElementsByClassName("publication");
			ths.secCount[i] = pubs.length;

			// add open/close per pub, and add permalink abilities
			for (var j = pubs.length - 1; j >= 0; j--) {
				ths.addCloseFunction(pubs[j], i);

				var permalink = document.createElement("a");
				var linkIcon = document.createElement("span");
				linkIcon.innerHTML = "&nbsp;\uf0c1";
				var heading = pubs[j].getElementsByTagName("h2")[0];
				permalink.href = "#" + pubs[j].id;

				heading.appendChild(linkIcon);
				heading.appendChild(permalink);

				pubs[j].id = "_" + pubs[j].id;
			}
		}
		// add tooltip, since some are truncated when collapsed
		var titles = document.getElementsByTagName("h2");
		for (i = titles.length - 1; i >= 0; i--) {
			if (titles[i].parentElement.classList.contains("publication")) {
				titles[i].setAttribute("title", titles[i].innerText);
			}
		}

		/// create css rules for per-image offset in collapsed view
		var cssGen = document.createElement("style");
		cssGen.type = "text/css";
		cssGen.innerHTML = "";

		var imgwraps = document.getElementsByClassName("imgwrap");
		for (i = imgwraps.length - 1; i >= 0; i--) {
			var offsetAttr = imgwraps[i].firstChild.attributes["data-left"];
			if (offsetAttr) {
				var offset = offsetAttr.value;

				cssGen.innerHTML = cssGen.innerHTML + '.collapsed img[data-left="' +
					offset + '"] { left: -' + offset/2 + "px; }\n" +
					"@media screen and (min-width: 820px)," +
					"screen and (min-width: 520px) and (max-width: 699px) {" +
					'.collapsed img[data-left="' + offset +
					'"] { left: -' + offset + "px; }}\n";
			}
		}
		document.getElementsByTagName("head")[0].appendChild(cssGen);

		/// check image corner background for closepub icon color
		for (i = imgwraps.length - 1; i >= 0; i--) {
			imgwraps[i].firstChild.addEventListener("load", function (evt) {
				let img = evt.target;

				// number of pixels from corner to average
				let averageRegion = 40;

				// create canvas
				let cvs = document.createElement("canvas");
				cvs.width = 1;
				cvs.height = 1;
				let ctx = cvs.getContext("2d");

				// draw image that would be below the icon into a 1x1,
				// allowing the browser to average pixels for us
				ctx.drawImage(img, 0, 0, averageRegion * ths.roundedRatio,
					averageRegion * ths.roundedRatio, 0, 0, 1, 1);
				// get the averaged pixel value
				let pxVal = ctx.getImageData(0, 0, 1, 1);

				// light background detected
				let lightness = (pxVal.data[0] + pxVal.data[1] + pxVal.data[2]) / 3;
				if (lightness > 127) {
					img.parentElement.setAttribute("data-bg", "light");	
				}
			});
		}

		/// add transition tag to talks
		var talks = document.getElementsByClassName("talk");
		for (i = talks.length - 1; i >= 0; i--) {
			talks[i].classList.add("transitions");
		}

		/// filtering options and single view options
		var singleArticle = false;
		if (window.location.hash.length > 1 && window.location.hash != '#?') {
			// prevent anchor on first load (not necessary due to singleView)
			// window.scrollTo(0, 0);  // fallback
			// document.getElementsByClassName("main")[0].scrollIntoView();

			if (window.location.hash[1] == "?") {
				ths.filterParser(window.location.hash.substring(2));
				ths.toggleFiltering(true);
			}
			else {
				ths.filterParser("");  // for animations, when no filters
				singleArticle = ths.singleView(window.location.hash.substring(1));
				if (!singleArticle) {
					window.location.hash = "#?";
				}
			}
		} else {
			ths.filterParser("");  // for animations, when no filters
		}
		window.addEventListener("hashchange", ths.hashParser);

		/// switch placeholder image with the real ones for faster load time
		var imgs = document.getElementsByTagName("img");
		var delayedIms = [];
		for (i = imgs.length - 1; i >= 0; i--) {
			if (imgs[i].getAttribute("data-src")) {
				if (!singleArticle ||
						imgs[i].parentElement.classList.contains("about")) {
					delayedIms.push(imgs[i]);
				}
			}
		}
		var firstIm = delayedIms.pop();
		setTimeout(function() { ths.loadImage(firstIm, delayedIms); }, 100);
	};

	// Adds the collapsed state, transition properties, and click functions
	ths.addCloseFunction = function(pub, secID) {
		pub.classList.add("collapsed");
		pub.onclick = function(evt) {
			if (this.classList.contains("collapsed")) {
				this.classList.remove("collapsed");
				ths.secCount[secID]--;
				if (ths.secCount[secID] === 0) {
					ths.secExpander[secID].onclick = ths.collapseAll(secID);
				}
			}
		};
		var closepub = document.createElement("div");
		closepub.className = "closepub";
		// closepub.innerText = "\uf066";
		closepub.onclick = function(evt) {
			if (!this.parentElement.parentElement.classList.contains("collapsed")) {
				this.parentElement.parentElement.classList.add("collapsed");
				if (ths.secCount[secID] === 0) {
					ths.secExpander[secID].onclick = ths.expandAll(secID);
				}
				ths.secCount[secID]++;
			}
			evt.stopPropagation();
		};
		pub.getElementsByClassName("imgwrap")[0].appendChild(closepub);

		setTimeout(function() { pub.classList.add("transitions"); }, 100);
	};

	// Change the button to the "Expand section" state
	// Returns the new onclick that will expand everything
	ths.expandAll = function(secID) {
		var clickFn = function(evt) {
			var ps = this.parentElement.getElementsByClassName("publication");
			for (var i = ps.length - 1; i >= 0; i--) {
				ps[i].classList.remove("collapsed");
			}
			// once expanded, replace self with the collapse onclick
			this.onclick = ths.collapseAll(secID);
			ths.secCount[secID] = 0;
		};
		ths.secExpander[secID].classList.remove("all-open");
		ths.secExpander[secID].innerHTML = "<span>\uf065</span>";
		return clickFn;
	};

	// Change the button to the "Collapse section"/all-open state
	// Returns the new onclick that will collapse everything
	ths.collapseAll = function(secID) {
		var clickFn = function(evt) {
			var ps = this.parentElement.getElementsByClassName("publication");
			for (var i = ps.length - 1; i >= 0; i--) {
				ps[i].classList.add("collapsed");
			}
			// once collapsed, replace self with the expand onclick
			this.onclick = ths.expandAll(secID);
			ths.secCount[secID] = ps.length;
		};
		ths.secExpander[secID].classList.add("all-open");
		ths.secExpander[secID].innerHTML = "<span>\uf066</span>";
		return clickFn;
	};

	ths.loadImage = function(img, nextList) {
		if (!img || img.hasAttribute("data-loaded")) {
			if (nextList) {
				let nextIm = nextList.pop();
				if (nextIm) {
					ths.loadImage(nextIm, nextList);
				}
			}
			return;
		}

		var newImgUrl = img.getAttribute("data-src").replace(
			"[[ratio]]", ths.resourceRatio);
		// pick closest resolution of the options
		var startWidthOpts = newImgUrl.indexOf("[[");
		if (startWidthOpts > -1) {
			var endWidthOpts = newImgUrl.indexOf("]]");
			let elemWidth = img.offsetWidth * ths.pxRatio;
			var widthOpts = newImgUrl.slice(startWidthOpts+2, endWidthOpts).split(
				",").map(function(val) { return parseInt(val); } );
			var closestWidth = -9999;
			for (var i = widthOpts.length - 1; i >= 0; i--) {
				if (Math.abs(widthOpts[i] - elemWidth) < Math.abs(closestWidth - elemWidth)) {
					closestWidth = widthOpts[i];
				}
			}

			newImgUrl = newImgUrl.slice(0, startWidthOpts) + closestWidth +
				newImgUrl.slice(endWidthOpts + 2)
		}
		var loadingSlow = true;
		var timeoutFired = false;

		// for smooth load animation
		img.parentElement.classList.add("loading");

		// load the image in js so we can trigger event
		img.addEventListener("load", function() {
			img.parentElement.classList.remove("loading");
			img.setAttribute("data-loaded", "");

			if (!timeoutFired && nextList) {
				// disable the timeout for next image
				loadingSlow = false;

				let nextIm = nextList.pop();
				if (nextIm) {
					ths.loadImage(nextIm, nextList);
				}
			}
		});
		img.setAttribute("src", newImgUrl);

		setTimeout(function() {
			if (loadingSlow && nextList) {
				// disable normal loading for next image
				timeoutFired = true;

				let nextIm = nextList.pop();
				if (nextIm) {
					ths.loadImage(nextIm, nextList);
				}
			}
		}, 1000);
	};

	ths.singleView = function(singleId) {
		var singleArticle = false;
		var selected = document.getElementById("_" + singleId);
		if (selected) {
			singleArticle = true;

			// scroll to top for single article view
			window.scrollTo(0, 0);  // fallback
			document.getElementsByClassName("main")[0].scrollIntoView();

			selected.classList.remove("collapsed");
			selected.classList.add("selected");
			var main = document.getElementsByClassName("main")[0];
			main.classList.add("single");
			var closepub = selected.getElementsByClassName("closepub")[0];

			// load just images for selected publication
			var imgs = selected.getElementsByTagName("img");
			var delayedIms = [];
			for (var i = imgs.length - 1; i >= 0; i--) {
				if (imgs[i].getAttribute("data-src") && !imgs[i].hasAttribute("data-loaded")) {
					delayedIms.push(imgs[i]);
				}
			}
			var firstIm = delayedIms.pop();
			ths.loadImage(firstIm, delayedIms);
			closepub.addEventListener("click", ths.loadFromSingle);
		}
		return singleArticle;
	};

	ths.loadFromSingle = function(evt) {
		evt.target.parentElement.parentElement.classList.remove("selected");
		var main = document.getElementsByClassName("main")[0];
		main.classList.remove("single");

		/// switch placeholder image with the real ones for faster load time
		var imgs = document.getElementsByTagName("img");
		var delayedIms = [];
		for (var i = imgs.length - 1; i >= 0; i--) {
			if (imgs[i].getAttribute("data-src") && !imgs[i].hasAttribute("data-loaded")) {
				delayedIms.push(imgs[i]);
			}
		}
		var firstIm = delayedIms.pop();
		ths.loadImage(firstIm, delayedIms);

		ths.filterParser("");  // adds a bunch of filter-open classes for animation
		if (window.location.hash[1] != "?") {
			window.location.hash = "#?";
			ths.toggleFiltering(false);
		}
		evt.target.removeEventListener("click", ths.loadFromSingle);
	};

	// set of filter functions
	ths.filterYear = function(year, elems) {
		for (var i = elems.length - 1; i >= 0; i--) {
			if (!elems[i].getAttribute("data-year").includes(year)) {
				elems[i].classList.add("filtered-out");
				elems[i].classList.remove("filter-open");
			}
		}
	};
	ths.filterJournal = function(journal, elems) {
		journal = decodeURIComponent(journal);
		for (var i = elems.length - 1; i >= 0; i--) {
			var elemJournal = elems[i].getAttribute("data-journal");
			var filterElem = false;

			if (journal.indexOf("(") > -1) {
				filterElem = elemJournal != journal;
			} else {
				filterElem = elemJournal.split("(")[0].trim() != journal;
			}

			if (filterElem) {
				elems[i].classList.add("filtered-out");
				elems[i].classList.remove("filter-open");
			}
		}
	};
	ths.filterFuncDict = {
		"year": ths.filterYear,
		"journal": ths.filterJournal,
	};
	ths.filterFormDict = {};
	// the function that parses the hash for the filters to apply 
	ths.filterParser = function(urlHash) {
		var filterables = Array.from(document.getElementsByClassName("publication")).concat(
			Array.from(document.getElementsByClassName("talk")));
		var secTitles = Array.from(document.getElementsByClassName("title")).concat(
			Array.from(document.getElementsByClassName("expandsec")));

		// clear all filters first, then apply
		for (var i = filterables.length - 1; i >= 0; i--) {
			filterables[i].classList.add("filter-open");
			filterables[i].classList.remove("filtered-out");
		}
		for (i = secTitles.length - 1; i >= 0; i--) {
			secTitles[i].classList.remove("filtered-out");
		}

		if (urlHash) {
			var filters = urlHash.split(',');

			for (i = filters.length - 1; i >= 0; i--) {
				var f = filters[i].split('=');
				if (f[0] in ths.filterFuncDict) {
					ths.filterFuncDict[f[0]](f[1], filterables);
					break;
				}
			}

			var sections = document.getElementsByClassName("section");
			for (i = sections.length - 1; i >= 0; i--) {
				var pubs = sections[i].getElementsByClassName("publication");
				var num_visible = 0;
				for (var j = pubs.length - 1; j >= 0; j--) {
					if (!pubs[j].classList.contains("filtered-out")) {
						num_visible++;
					}
				}
				if (num_visible == 0) {
					sections[i].getElementsByClassName(
						"title")[0].classList.add("filtered-out");
					sections[i].getElementsByClassName(
						"expandsec")[0].classList.add("filtered-out");
				} else {
					sections[i].getElementsByClassName(
						"title")[0].classList.remove("filtered-out");
					sections[i].getElementsByClassName(
						"expandsec")[0].classList.remove("filtered-out");
				}
			}
			sections = document.getElementsByClassName("basic-section");
			for (i = sections.length - 1; i >= 0; i--) {
				var talks = sections[i].getElementsByClassName("talk");
				var num_visible = 0;
				for (var j = talks.length - 1; j >= 0; j--) {
					if (!talks[j].classList.contains("filtered-out")) {
						num_visible++;
					}
				}
				if (num_visible == 0) {
					sections[i].getElementsByClassName(
						"title")[0].classList.add("filtered-out");
				} else {
					sections[i].getElementsByClassName(
						"title")[0].classList.remove("filtered-out");
				}
			}
		}
	};
	ths.toggleFiltering = function(forcedState) {
		var filtersActive = ths.navbar.classList.contains("filters-active");
		var stateForced = typeof forcedState == 'boolean';
		if (stateForced) {
			filtersActive = !forcedState;
		}

		if (filtersActive) {
			ths.navbar.classList.remove("filters-active");
			ths.filterChooser.selectedIndex = 0;
			ths.updateFilterType();
			ths.updateFilterUrl();
		} else {
			ths.navbar.classList.add("filters-active");
			if (stateForced) {
				var filters = window.location.hash.substring(2).split(",");

				for (var i = filters.length - 1; i >= 0; i--) {
					var f = filters[i].split('=');
					if (f[0] in ths.filterFormDict) {
						ths.filterChooser.value = f[0];
						ths.updateFilterType(false);
						ths.filterFormDict[f[0]].value = decodeURIComponent(f[1]);
						break;  // only one allowed
					}
				}
			}
		}
	};
	ths.initializeFilter = function(attrName, unselectedName, reversedOrder) {
		var filterables = Array.from(document.getElementsByClassName("publication")).concat(
			Array.from(document.getElementsByClassName("talk")));
		var targetList = [];

		var opt = document.createElement("option");
		opt.innerText = unselectedName;
		opt.value = attrName.split("-")[1];
		ths.filterChooser.appendChild(opt);

		for (var i = filterables.length - 1; i >= 0; i--) {
			var newValList = filterables[i].getAttribute(attrName).split(',');
			for (var j = newValList.length - 1; j >= 0; j--) {
				var newVal = newValList[j];

				if (targetList.indexOf(newVal) == -1) {
					targetList.push(newVal);

					// category for "nested" filters
					if (newVal.indexOf("(") > -1) {
						var valCategory = newVal.split("(")[0].trim();
						if (targetList.indexOf(valCategory) == -1) {
							targetList.push(valCategory);
						}
					}
				}
			}
		}
		targetList.sort();
		if (reversedOrder) {
			targetList.reverse();
		}

		var filterContainer = document.getElementsByClassName('filter-float')[0];
		var wrapperDiv = document.createElement("div");
		wrapperDiv.classList.add("select-wrapper");
		wrapperDiv.classList.add("inactive-choice");
		var selectForm = document.createElement("select");
		opt = document.createElement("option");
		opt.innerText = "Any";
		selectForm.appendChild(opt);
		var optgroup = document.createElement("optgroup");
		optgroup.label = "–".repeat(unselectedName.length);
		selectForm.appendChild(optgroup);
		for (var i = 0; i < targetList.length; i++) {
			opt = document.createElement("option");
			var optText = targetList[i];
			if (optText.indexOf("(") == -1) {
				opt.innerText = optText;
				opt.value = optText;
			} else {
				// '\xa0' is nbsp
				opt.innerText = "\xa0 \xa0" + optText.replace(
					"(", "").replace(")", "");
				opt.value = optText;
			}
			selectForm.appendChild(opt);
		}
		wrapperDiv.appendChild(selectForm);
		filterContainer.appendChild(wrapperDiv);

		selectForm.onchange = ths.updateFilterUrl;

		ths.filterFormDict[attrName.split("-")[1]] = selectForm;
	}
	ths.updateFilterUrl = function() {
		var urlHash = "";
		for (const form in ths.filterFormDict) {
			if (ths.filterFormDict[form].selectedIndex > 0) {
				urlHash += "," + form + "=";
				urlHash += ths.filterFormDict[form].value;	
			}
		}
		window.location.hash = "#?" + urlHash.substring(1);
	}
	ths.updateFilterType = function(resetUrl) {
		var unchosenFilter = document.getElementById("filter_unchosen");
		if (ths.filterChooser.selectedIndex == 0) {
			unchosenFilter.parentElement.classList.remove("inactive-choice");
		} else {
			unchosenFilter.parentElement.classList.add("inactive-choice");
		}
		for (const form in ths.filterFormDict) {
			ths.filterFormDict[form].selectedIndex = 0;
			if (ths.filterChooser.value == form) {
				ths.filterFormDict[form].parentElement.classList.remove("inactive-choice");
			} else {
				ths.filterFormDict[form].parentElement.classList.add("inactive-choice");
			}
		}
		if (typeof resetUrl != 'boolean' || resetUrl) {
			ths.updateFilterUrl();
		}
	}

	ths.hashParser = function(evt) {
		var urlSplit = evt.newURL.split('#');
		var oldSplit = evt.oldURL.split('#');
		var urlFilter = urlSplit.length == 2 && urlSplit[1][0] == '?';
		var urlAnchor = urlSplit.length == 2 && urlSplit[1].length > 0 && !urlFilter;
		var oldFilter = oldSplit.length == 2 && oldSplit[1][0] == '?';
		var oldAnchor = oldSplit.length == 2 && oldSplit[1].length > 0 && !oldFilter;

		var oldSel, closepub;

		if (urlAnchor) {
			var idExists = ths.singleView(urlSplit[1]);

			if (idExists) {
				if (oldAnchor) {
					oldSel = document.getElementById("_" + oldSplit[1]);
					if (oldSel) {
						oldSel.classList.remove("selected");
						oldSel.classList.add("collapsed");
						closepub = oldSel.getElementsByClassName("closepub")[0];
						closepub.removeEventListener("click", ths.loadFromSingle);
					}
				} else if (oldFilter) {
					ths.filterParser("");
				}
			} else {
				if (oldSplit.length == 2) {
					window.location.hash = "#" + oldSplit[1];
				} else if (oldSplit.length == 1) {
					window.location.hash = "#?";
				}
			}
		}
		else {
			if (oldAnchor) {
				oldSel = document.getElementById("_" + oldSplit[1]);
				if (oldSel) {
					closepub = oldSel.getElementsByClassName("closepub")[0];
					closepub.click();
				}
			}

			ths.filterParser(urlSplit[1].substring(1));
		}
	};

	ths.addDynamicBorderTargets = function() {
		var targets = ths.navbar.querySelectorAll("a, .filter-button, .select-wrapper");
		for (var i = targets.length - 1; i >= 0; i--) {
			targets[i].addEventListener("mouseenter", function(evt) {
				let navbarBox = ths.navbar.getBoundingClientRect();
				let navBorderBox = ths.navBorder.getBoundingClientRect();
				let targetBox = evt.target.getBoundingClientRect();

				ths.navBorder.classList.add("active");
				ths.navBorder.style.left = (targetBox.left
					- navbarBox.left) + "px";
				ths.navBorder.style.top = (targetBox.top - navbarBox.top
					+ targetBox.height - navBorderBox.height) + "px";
				ths.navBorder.style.width = targetBox.width + "px";
			});
			targets[i].addEventListener("mouseleave", function(evt) {
				ths.navBorder.classList.remove("active");
				ths.navBorder.style.left = "";
				ths.navBorder.style.top = "";
				ths.navBorder.style.width = "";
			});
		}
	};

	return ths;
};

window.addEventListener("load", scripts().begin);
