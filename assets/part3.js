// Radar Chart: Peer Diversification Comparison
(function() {
    const axes = [
        "Export\nDiversification", "Sovereign Wealth\n(% GDP)",
        "Services\nExports %", "Manufacturing\nExports %",
        "Green Economy\nIndex", "R&D Spend\n(% GDP)"
    ];
    const allCountries = [
        { name: "Australia", color: "#3b7d6b", values: [3.2, 2.8, 5.1, 4.2, 5.8, 4.4] },
        { name: "Norway", color: "#9c6644", values: [6.5, 9.2, 7.8, 6.0, 8.5, 7.1] },
        { name: "Canada", color: "#457b9d", values: [6.0, 1.5, 6.5, 7.5, 6.2, 6.8] },
        { name: "Chile", color: "#b56576", values: [2.8, 4.0, 3.5, 3.8, 4.1, 2.6] },
        { name: "Saudi Arabia", color: "#588157", values: [2.0, 8.5, 3.0, 2.5, 3.5, 2.2] }
    ];

    const active = new Set(allCountries.map(c => c.name));
    const host = document.getElementById("radar-chart");
    const filterEl = document.getElementById("radar-filters");
    const tip = createChartTooltipElement();

    allCountries.forEach(c => {
        const btn = document.createElement("button");
        btn.textContent = c.name;
        btn.dataset.country = c.name;
        btn.style.cssText = `padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:2px solid ${c.color};background:${c.color};color:#fff;transition:opacity 0.2s;`;
        btn.addEventListener("click", () => {
            if (c.name === "Australia") return;
            if (active.has(c.name)) {
                active.delete(c.name);
                btn.style.background = "transparent";
                btn.style.color = c.color;
            } else {
                active.add(c.name);
                btn.style.background = c.color;
                btn.style.color = "#fff";
            }
            render();
        });
        filterEl.appendChild(btn);
    });

    function render() {
        const countries = allCountries.filter(c => active.has(c.name));
        const fullW = host.getBoundingClientRect().width || 900;
        const fullH = 500;
        const svg = d3.select("#radar-chart")
            .selectAll("svg")
            .data([null])
            .join("svg")
            .style("display", "block")
            .style("width", "100%")
            .style("height", "100%")
            .attr("viewBox", `0 0 ${fullW} ${fullH}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        svg.selectAll("*").remove();

        const padX = 90;
        const padY = 55;
        const cx = fullW / 2;
        const cy = fullH / 2 + 8;
        const radius = Math.min(fullW - padX * 2, fullH - padY * 2) / 2;
        const n = axes.length;
        const levels = 5;
        const angleSlice = (2 * Math.PI) / n;
        const g = svg.append("g");

        for (let level = 1; level <= levels; level++) {
            const r = radius * level / levels;
            const pts = axes.map((_, index) => {
                const angle = angleSlice * index - Math.PI / 2;
                return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
            });
            g.append("polygon")
                .attr("points", pts.map(point => point.join(",")).join(" "))
                .attr("fill", level % 2 === 0 ? "rgba(228,215,193,0.2)" : "none")
                .attr("stroke", "#d4c9b0")
                .attr("stroke-width", 0.8)
                .attr("stroke-opacity", 0.7);
            g.append("text")
                .attr("x", cx + 4)
                .attr("y", cy - r + 3)
                .attr("font-size", "9px")
                .attr("fill", "#9ca3af")
                .text(((level / levels) * 10).toFixed(0));
        }

        axes.forEach((_, index) => {
            const angle = angleSlice * index - Math.PI / 2;
            g.append("line")
                .attr("x1", cx)
                .attr("y1", cy)
                .attr("x2", cx + radius * Math.cos(angle))
                .attr("y2", cy + radius * Math.sin(angle))
                .attr("stroke", "#c9bfa8")
                .attr("stroke-width", 0.8);
        });

        axes.forEach((label, index) => {
            const angle = angleSlice * index - Math.PI / 2;
            const dist = radius + 42;
            const lx = cx + dist * Math.cos(angle);
            const ly = cy + dist * Math.sin(angle);
            const lines = label.split("\n");
            const anchor = Math.abs(Math.cos(angle)) < 0.1 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
            const textEl = g.append("text")
                .attr("x", lx)
                .attr("y", ly)
                .attr("text-anchor", anchor)
                .attr("dominant-baseline", "middle")
                .attr("font-size", "11px")
                .attr("font-weight", "600")
                .attr("fill", "#374151");
            lines.forEach((line, lineIndex) => {
                textEl.append("tspan")
                    .attr("x", lx)
                    .attr("dy", lineIndex === 0 ? `${-(lines.length - 1) * 0.55}em` : "1.15em")
                    .text(line);
            });
        });

        countries.forEach(country => {
            const pts = country.values.map((value, index) => {
                const angle = angleSlice * index - Math.PI / 2;
                const r = (value / 10) * radius;
                return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
            });
            const pathStr = pts.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`).join(" ") + " Z";

            g.append("path")
                .attr("d", pathStr)
                .attr("fill", country.color)
                .attr("fill-opacity", 0.1)
                .attr("stroke", country.color)
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.9);

            pts.forEach((point, index) => {
                g.append("circle")
                    .attr("cx", point[0])
                    .attr("cy", point[1])
                    .attr("r", 4)
                    .attr("fill", country.color)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 1)
                    .style("cursor", "pointer")
                    .on("mouseover", function(event) {
                        tip.style.display = "block";
                        tip.innerHTML = tooltipRowsToHtml([
                            { key: "country", value: country.name },
                            { key: "metric", value: axes[index].replace("\n", " ") },
                            { key: "score", value: `${country.values[index].toFixed(1)} / 10` }
                        ]);
                        tip.style.left = (event.pageX + 12) + "px";
                        tip.style.top = (event.pageY - 12) + "px";
                    })
                    .on("mousemove", event => {
                        tip.style.left = (event.pageX + 12) + "px";
                        tip.style.top = (event.pageY - 12) + "px";
                    })
                    .on("mouseout", () => {
                        tip.style.display = "none";
                    });
            });
        });

        const legX = fullW - 130;
        const legY = 16;
        countries.forEach((country, index) => {
            g.append("line")
                .attr("x1", legX)
                .attr("x2", legX + 16)
                .attr("y1", legY + index * 20 + 5)
                .attr("y2", legY + index * 20 + 5)
                .attr("stroke", country.color)
                .attr("stroke-width", 3);
            g.append("text")
                .attr("x", legX + 22)
                .attr("y", legY + index * 20 + 9)
                .attr("font-size", "11px")
                .attr("fill", "#374151")
                .text(country.name);
        });

        svg.append("text")
            .attr("x", fullW / 2)
            .attr("y", 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "700")
            .attr("fill", "#2f2f67")
            .text("Economic Resilience Radar — Australia vs Resource-Rich Peers");

        if (countries.length > 1) {
            const sovereignLeader = countries.slice().sort((a, b) => d3.descending(a.values[1], b.values[1]))[0];
            const manufacturingLeader = countries.slice().sort((a, b) => d3.descending(a.values[3], b.values[3]))[0];
            drawSvgAnnotation(g, {
                x: 22,
                y: 22,
                lines: [
                    { text: "Peer benchmark" },
                    { text: `Sovereign wealth leader: ${sovereignLeader.name}` },
                    { text: `Manufacturing leader: ${manufacturingLeader.name}` }
                ]
            });
        }
    }

    render();
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 160);
    });
})();

// Dumbbell Chart: Diversification Opportunity Ladder
(function() {
    const sectors = [
        { name: "Green Hydrogen", current: 0.5, potential: 50, color: "#3b7d6b" },
        { name: "Critical Minerals", current: 8, potential: 35, color: "#588157" },
        { name: "Agriculture & Food", current: 48, potential: 70, color: "#9c6644" },
        { name: "Education & Skills", current: 24, potential: 40, color: "#457b9d" },
        { name: "Tourism", current: 18, potential: 45, color: "#7f5539" },
        { name: "Digital & Tech Svcs", current: 12, potential: 30, color: "#6d597a" },
        { name: "Defence Industry", current: 3, potential: 15, color: "#5f6b7a" }
    ].map((sector, index) => ({
        ...sector,
        originalIndex: index,
        growthPct: ((sector.potential - sector.current) / sector.current) * 100
    }));

    const maxPotential = Math.max(...sectors.map(sector => sector.potential));
    const host = document.getElementById("dumbbell-chart");
    const sortSelect = document.getElementById("opportunitySortSelect");
    const tip = createChartTooltipElement();
    const state = { sortBy: "original" };

    function getSortedSectors() {
        const sorted = sectors.slice();
        switch (state.sortBy) {
        case "current":
            sorted.sort((a, b) => d3.descending(a.current, b.current) || d3.ascending(a.name, b.name));
            break;
        case "potential":
            sorted.sort((a, b) => d3.descending(a.potential, b.potential) || d3.ascending(a.name, b.name));
            break;
        case "growthPct":
            sorted.sort((a, b) => d3.descending(a.growthPct, b.growthPct) || d3.ascending(a.name, b.name));
            break;
        default:
            sorted.sort((a, b) => d3.ascending(a.originalIndex, b.originalIndex));
            break;
        }
        return sorted;
    }

    function render() {
        const fullW = host.getBoundingClientRect().width || 900;
        const fullH = 440;
        const margin = { top: 56, right: 20, bottom: 44, left: 155 };
        const W = fullW - margin.left - margin.right;
        const H = fullH - margin.top - margin.bottom;
        const sortedSectors = getSortedSectors();
        const rowH = H / sortedSectors.length;

        const svg = d3.select("#dumbbell-chart")
            .selectAll("svg")
            .data([null])
            .join("svg")
            .style("display", "block")
            .style("width", "100%")
            .style("height", "100%")
            .attr("viewBox", `0 0 ${fullW} ${fullH}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        svg.selectAll("*").remove();

        const xMax = maxPotential * 1.05;
        const xScale = d3.scaleLinear().domain([0, xMax]).range([0, W]);
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        svg.append("text")
            .attr("x", margin.left + W / 2)
            .attr("y", 18)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .attr("font-weight", "700")
            .attr("fill", "#2f2f67")
            .text("Diversification Opportunity Ladder — 2024 Current vs 2035 Potential (AUD Billions)");

        g.append("g")
            .attr("transform", `translate(0,${H})`)
            .call(d3.axisBottom(xScale).ticks(7).tickFormat(d => `$${d}B`))
            .selectAll("text")
            .style("font-size", "11px");

        xScale.ticks(7).forEach(tickValue => {
            g.append("line")
                .attr("x1", xScale(tickValue))
                .attr("x2", xScale(tickValue))
                .attr("y1", 0)
                .attr("y2", H)
                .attr("stroke", "#e4d7c1")
                .attr("stroke-width", 0.8);
        });

        const legItems = [
            { label: "2024 (current)", filled: false },
            { label: "2035 (potential)", filled: true }
        ];
        legItems.forEach((item, index) => {
            g.append("circle")
                .attr("cx", W - 200 + index * 110 + 8)
                .attr("cy", -22)
                .attr("r", 7)
                .attr("fill", item.filled ? "#3b7d6b" : "#fffaf0")
                .attr("stroke", "#3b7d6b")
                .attr("stroke-width", 2);
            g.append("text")
                .attr("x", W - 200 + index * 110 + 20)
                .attr("y", -18)
                .attr("font-size", "11px")
                .attr("fill", "#374151")
                .text(item.label);
        });

        const highestGrowth = sectors.slice().sort((a, b) => d3.descending(a.growthPct, b.growthPct))[0];
        drawSvgAnnotation(g, {
            x: 10,
            y: 18,
            lines: [
                { text: "Largest relative upside" },
                { text: `${highestGrowth.name} adds AUD ${(highestGrowth.potential - highestGrowth.current).toFixed(1)}B` }
            ]
        });

        sortedSectors.forEach((sector, index) => {
            const y = index * rowH + rowH / 2;
            g.append("rect")
                .attr("x", -margin.left + 2)
                .attr("y", y - rowH / 2 + 2)
                .attr("width", W + margin.left - 4)
                .attr("height", rowH - 4)
                .attr("fill", index % 2 === 0 ? "rgba(248,240,223,0.5)" : "transparent")
                .attr("rx", 2);

            g.append("text")
                .attr("x", -12)
                .attr("y", y)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .attr("font-size", "12px")
                .attr("font-weight", "600")
                .attr("fill", "#374151")
                .text(sector.name);

            g.append("line")
                .attr("x1", xScale(sector.current))
                .attr("x2", xScale(sector.potential))
                .attr("y1", y)
                .attr("y2", y)
                .attr("stroke", sector.color)
                .attr("stroke-width", 3.5)
                .attr("stroke-opacity", 0.3);

            const gapPx = xScale(sector.potential) - xScale(sector.current);
            const mid = (xScale(sector.current) + xScale(sector.potential)) / 2;
            if (gapPx > 24) {
                g.append("text")
                    .attr("x", mid)
                    .attr("y", y - 12)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "10px")
                    .attr("fill", sector.color)
                    .attr("font-weight", "700")
                    .text(`+$${(sector.potential - sector.current).toFixed(sector.potential - sector.current < 10 ? 1 : 0)}B`);
            }

            function showSectorTooltip(event) {
                tip.style.display = "block";
                tip.innerHTML = tooltipRowsToHtml([
                    { key: "sector", value: sector.name },
                    { key: "current (2024)", value: `$${sector.current}B` },
                    { key: "potential (2035)", value: `$${sector.potential}B` },
                    { key: "growth", value: `${Math.round(sector.growthPct).toLocaleString()}%` }
                ]);
                tip.style.left = (event.pageX + 12) + "px";
                tip.style.top = (event.pageY - 12) + "px";
            }

            g.append("circle")
                .attr("cx", xScale(sector.current))
                .attr("cy", y)
                .attr("r", 7)
                .attr("fill", "#fffaf0")
                .attr("stroke", sector.color)
                .attr("stroke-width", 2.5)
                .style("cursor", "pointer")
                .on("mouseover", showSectorTooltip)
                .on("mousemove", event => {
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mouseout", () => {
                    tip.style.display = "none";
                });

            g.append("circle")
                .attr("cx", xScale(sector.potential))
                .attr("cy", y)
                .attr("r", 7)
                .attr("fill", sector.color)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5)
                .style("cursor", "pointer")
                .on("mouseover", showSectorTooltip)
                .on("mousemove", event => {
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mouseout", () => {
                    tip.style.display = "none";
                });
        });
    }

    render();
    sortSelect.addEventListener("change", function() {
        state.sortBy = this.value;
        render();
    });
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 160);
    });
})();

// Diverging Stacked Bar: Portfolio Scenarios
(function() {
    const rows = [
        { label: "2024 (Actual)", group: "Baseline", ironOre: 32, coal: 13, other: 55 },
        { label: "2030 Business-as-Usual", group: "Business-as-Usual", ironOre: 30, coal: 12, other: 58 },
        { label: "2035 Business-as-Usual", group: "Business-as-Usual", ironOre: 29, coal: 11, other: 60 },
        { label: "2030 Diversified", group: "Managed Diversif.", ironOre: 24, coal: 9, other: 67 },
        { label: "2035 Diversified", group: "Managed Diversif.", ironOre: 18, coal: 6, other: 76 }
    ];

    const groupColors = {
        "Baseline": "#6b7280",
        "Business-as-Usual": "#9c6644",
        "Managed Diversif.": "#3b7d6b"
    };

    const host = document.getElementById("scenario-bar-chart");
    const tip = createChartTooltipElement();

    function render() {
        const fullW = host.getBoundingClientRect().width || 900;
        const fullH = 420;
        const margin = { top: 52, right: 16, bottom: 72, left: 180 };
        const W = fullW - margin.left - margin.right;
        const H = fullH - margin.top - margin.bottom;
        const bH = Math.max(28, (H / rows.length) - 10);

        const svg = d3.select("#scenario-bar-chart")
            .selectAll("svg")
            .data([null])
            .join("svg")
            .style("display", "block")
            .style("width", "100%")
            .style("height", "100%")
            .attr("viewBox", `0 0 ${fullW} ${fullH}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
        svg.selectAll("*").remove();

        const pivot = 45;
        const xScale = d3.scaleLinear().domain([-pivot, 100 - pivot]).range([0, W]);
        const centerX = xScale(0);
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        svg.append("text")
            .attr("x", margin.left + W / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .attr("font-weight", "700")
            .attr("fill", "#2f2f67")
            .text("Export Portfolio Scenarios — Resource vs Diversified Share (% of total exports)");

        g.append("text")
            .attr("x", centerX - 10)
            .attr("y", -20)
            .attr("text-anchor", "end")
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", "#b56576")
            .text("← Resource Dependent");
        g.append("text")
            .attr("x", centerX + 10)
            .attr("y", -20)
            .attr("text-anchor", "start")
            .attr("font-size", "11px")
            .attr("font-weight", "700")
            .attr("fill", "#3b7d6b")
            .text("Diversified →");

        g.append("rect")
            .attr("x", 0)
            .attr("y", -6)
            .attr("width", centerX)
            .attr("height", H + 6)
            .attr("fill", "rgba(181,101,118,0.04)");
        g.append("rect")
            .attr("x", centerX)
            .attr("y", -6)
            .attr("width", W - centerX)
            .attr("height", H + 6)
            .attr("fill", "rgba(59,125,107,0.04)");

        g.append("line")
            .attr("x1", centerX)
            .attr("x2", centerX)
            .attr("y1", -6)
            .attr("y2", H)
            .attr("stroke", "#9ca3af")
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "4,3");

        const rowH = H / rows.length;
        g.append("line")
            .attr("x1", -margin.left + 4)
            .attr("x2", W)
            .attr("y1", rowH * 1 - 5)
            .attr("y2", rowH * 1 - 5)
            .attr("stroke", "#d1c7b5")
            .attr("stroke-dasharray", "5,4")
            .attr("stroke-width", 1);
        g.append("line")
            .attr("x1", -margin.left + 4)
            .attr("x2", W)
            .attr("y1", rowH * 3 - 5)
            .attr("y2", rowH * 3 - 5)
            .attr("stroke", "#d1c7b5")
            .attr("stroke-dasharray", "5,4")
            .attr("stroke-width", 1);

        rows.forEach((row, index) => {
            const yMid = index * rowH + rowH / 2;
            const yTop = yMid - bH / 2;
            const groupColor = groupColors[row.group];
            const ironColor = row.group === "Managed Diversif." ? "#c47a7a" : "#b56576";
            const coalColor = row.group === "Managed Diversif." ? "#d4a070" : "#c49060";
            const otherColor = row.group === "Managed Diversif." ? "#3b7d6b" : "#8fb3a3";

            g.append("text")
                .attr("x", -12)
                .attr("y", yMid)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .attr("font-size", "12px")
                .attr("font-weight", "700")
                .attr("fill", groupColor)
                .text(row.label);

            const ironW = centerX - xScale(-row.ironOre);
            g.append("rect")
                .attr("x", centerX - ironW)
                .attr("y", yTop)
                .attr("width", ironW)
                .attr("height", bH)
                .attr("fill", ironColor)
                .attr("rx", 2)
                .style("cursor", "pointer")
                .on("mouseover", event => {
                    tip.style.display = "block";
                    tip.innerHTML = tooltipRowsToHtml([
                        { key: "scenario", value: row.label },
                        { key: "segment", value: "iron ore" },
                        { key: "share", value: `${row.ironOre}%` }
                    ]);
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mousemove", event => {
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mouseout", () => {
                    tip.style.display = "none";
                });

            const coalW = centerX - xScale(-row.coal);
            g.append("rect")
                .attr("x", centerX - ironW - coalW)
                .attr("y", yTop)
                .attr("width", coalW)
                .attr("height", bH)
                .attr("fill", coalColor)
                .attr("rx", 2)
                .style("cursor", "pointer")
                .on("mouseover", event => {
                    tip.style.display = "block";
                    tip.innerHTML = tooltipRowsToHtml([
                        { key: "scenario", value: row.label },
                        { key: "segment", value: "coal" },
                        { key: "share", value: `${row.coal}%` }
                    ]);
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mousemove", event => {
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mouseout", () => {
                    tip.style.display = "none";
                });

            const otherW = xScale(row.other - pivot) - xScale(0);
            g.append("rect")
                .attr("x", centerX)
                .attr("y", yTop)
                .attr("width", otherW)
                .attr("height", bH)
                .attr("fill", otherColor)
                .attr("rx", 2)
                .style("cursor", "pointer")
                .on("mouseover", event => {
                    tip.style.display = "block";
                    tip.innerHTML = tooltipRowsToHtml([
                        { key: "scenario", value: row.label },
                        { key: "segment", value: "other exports" },
                        { key: "share", value: `${row.other}%` }
                    ]);
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mousemove", event => {
                    tip.style.left = (event.pageX + 12) + "px";
                    tip.style.top = (event.pageY - 12) + "px";
                })
                .on("mouseout", () => {
                    tip.style.display = "none";
                });

            if (ironW > 26) {
                g.append("text")
                    .attr("x", centerX - ironW / 2)
                    .attr("y", yMid)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .attr("font-size", "10px")
                    .attr("fill", "#fff")
                    .attr("font-weight", "700")
                    .text(`${row.ironOre}%`);
            }
            if (coalW > 26) {
                g.append("text")
                    .attr("x", centerX - ironW - coalW / 2)
                    .attr("y", yMid)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .attr("font-size", "10px")
                    .attr("fill", "#fff")
                    .attr("font-weight", "700")
                    .text(`${row.coal}%`);
            }
            if (otherW > 26) {
                g.append("text")
                    .attr("x", centerX + otherW / 2)
                    .attr("y", yMid)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .attr("font-size", "10px")
                    .attr("fill", "#fff")
                    .attr("font-weight", "700")
                    .text(`${row.other}%`);
            }
        });

        const legend = [
            { color: "#b56576", label: "Iron Ore" },
            { color: "#c49060", label: "Coal" },
            { color: "#3b7d6b", label: "All Other Exports" }
        ];
        const legY = H + 30;
        const legSpacing = W / legend.length;
        legend.forEach((item, index) => {
            const lx = index * legSpacing + legSpacing / 2 - 50;
            g.append("rect")
                .attr("x", lx)
                .attr("y", legY)
                .attr("width", 13)
                .attr("height", 13)
                .attr("rx", 2)
                .attr("fill", item.color);
            g.append("text")
                .attr("x", lx + 18)
                .attr("y", legY + 10)
                .attr("font-size", "11px")
                .attr("fill", "#374151")
                .text(item.label);
        });

        drawSvgAnnotation(g, {
            x: Math.max(18, W - 235),
            y: 34,
            lines: [
                { text: "2035 comparison" },
                { text: "BAU: 40% iron ore + coal" },
                { text: "Diversified: 24% iron ore + coal" }
            ]
        });
    }

    render();
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 160);
    });
})();
