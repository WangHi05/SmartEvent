/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
$(document).ready(function() {

    $(".click-title").mouseenter( function(    e){
        e.preventDefault();
        this.style.cursor="pointer";
    });
    $(".click-title").mousedown( function(event){
        event.preventDefault();
    });

    // Ugly code while this script is shared among several pages
    try{
        refreshHitsPerSecond(true);
    } catch(e){}
    try{
        refreshResponseTimeOverTime(true);
    } catch(e){}
    try{
        refreshResponseTimePercentiles();
    } catch(e){}
});


var responseTimePercentilesInfos = {
        data: {"result": {"minY": 24.0, "minX": 0.0, "maxY": 16772.0, "series": [{"data": [[0.0, 24.0], [0.1, 32.0], [0.2, 36.0], [0.3, 45.0], [0.4, 49.0], [0.5, 51.0], [0.6, 52.0], [0.7, 53.0], [0.8, 55.0], [0.9, 56.0], [1.0, 57.0], [1.1, 57.0], [1.2, 58.0], [1.3, 59.0], [1.4, 59.0], [1.5, 60.0], [1.6, 61.0], [1.7, 62.0], [1.8, 63.0], [1.9, 64.0], [2.0, 64.0], [2.1, 65.0], [2.2, 66.0], [2.3, 67.0], [2.4, 68.0], [2.5, 69.0], [2.6, 70.0], [2.7, 71.0], [2.8, 73.0], [2.9, 76.0], [3.0, 77.0], [3.1, 79.0], [3.2, 80.0], [3.3, 81.0], [3.4, 82.0], [3.5, 83.0], [3.6, 84.0], [3.7, 85.0], [3.8, 87.0], [3.9, 88.0], [4.0, 89.0], [4.1, 91.0], [4.2, 92.0], [4.3, 94.0], [4.4, 95.0], [4.5, 96.0], [4.6, 98.0], [4.7, 100.0], [4.8, 102.0], [4.9, 103.0], [5.0, 105.0], [5.1, 108.0], [5.2, 110.0], [5.3, 113.0], [5.4, 116.0], [5.5, 124.0], [5.6, 130.0], [5.7, 140.0], [5.8, 151.0], [5.9, 165.0], [6.0, 177.0], [6.1, 179.0], [6.2, 210.0], [6.3, 223.0], [6.4, 229.0], [6.5, 251.0], [6.6, 253.0], [6.7, 279.0], [6.8, 286.0], [6.9, 296.0], [7.0, 297.0], [7.1, 301.0], [7.2, 303.0], [7.3, 306.0], [7.4, 307.0], [7.5, 309.0], [7.6, 313.0], [7.7, 320.0], [7.8, 327.0], [7.9, 330.0], [8.0, 341.0], [8.1, 343.0], [8.2, 344.0], [8.3, 346.0], [8.4, 348.0], [8.5, 352.0], [8.6, 354.0], [8.7, 358.0], [8.8, 363.0], [8.9, 364.0], [9.0, 367.0], [9.1, 379.0], [9.2, 381.0], [9.3, 382.0], [9.4, 385.0], [9.5, 388.0], [9.6, 392.0], [9.7, 398.0], [9.8, 399.0], [9.9, 400.0], [10.0, 401.0], [10.1, 401.0], [10.2, 402.0], [10.3, 402.0], [10.4, 403.0], [10.5, 403.0], [10.6, 403.0], [10.7, 404.0], [10.8, 404.0], [10.9, 407.0], [11.0, 408.0], [11.1, 408.0], [11.2, 408.0], [11.3, 409.0], [11.4, 409.0], [11.5, 409.0], [11.6, 409.0], [11.7, 410.0], [11.8, 410.0], [11.9, 410.0], [12.0, 410.0], [12.1, 410.0], [12.2, 410.0], [12.3, 410.0], [12.4, 411.0], [12.5, 411.0], [12.6, 411.0], [12.7, 411.0], [12.8, 411.0], [12.9, 411.0], [13.0, 411.0], [13.1, 412.0], [13.2, 412.0], [13.3, 412.0], [13.4, 412.0], [13.5, 413.0], [13.6, 413.0], [13.7, 413.0], [13.8, 414.0], [13.9, 414.0], [14.0, 414.0], [14.1, 415.0], [14.2, 416.0], [14.3, 416.0], [14.4, 417.0], [14.5, 418.0], [14.6, 419.0], [14.7, 419.0], [14.8, 419.0], [14.9, 420.0], [15.0, 420.0], [15.1, 420.0], [15.2, 421.0], [15.3, 421.0], [15.4, 421.0], [15.5, 421.0], [15.6, 421.0], [15.7, 421.0], [15.8, 422.0], [15.9, 422.0], [16.0, 422.0], [16.1, 422.0], [16.2, 423.0], [16.3, 423.0], [16.4, 424.0], [16.5, 424.0], [16.6, 425.0], [16.7, 425.0], [16.8, 425.0], [16.9, 426.0], [17.0, 426.0], [17.1, 426.0], [17.2, 426.0], [17.3, 426.0], [17.4, 427.0], [17.5, 427.0], [17.6, 428.0], [17.7, 428.0], [17.8, 429.0], [17.9, 429.0], [18.0, 430.0], [18.1, 431.0], [18.2, 431.0], [18.3, 432.0], [18.4, 432.0], [18.5, 432.0], [18.6, 433.0], [18.7, 437.0], [18.8, 443.0], [18.9, 444.0], [19.0, 445.0], [19.1, 445.0], [19.2, 446.0], [19.3, 446.0], [19.4, 447.0], [19.5, 447.0], [19.6, 448.0], [19.7, 448.0], [19.8, 449.0], [19.9, 450.0], [20.0, 451.0], [20.1, 451.0], [20.2, 452.0], [20.3, 452.0], [20.4, 453.0], [20.5, 453.0], [20.6, 454.0], [20.7, 454.0], [20.8, 454.0], [20.9, 454.0], [21.0, 454.0], [21.1, 455.0], [21.2, 455.0], [21.3, 455.0], [21.4, 455.0], [21.5, 455.0], [21.6, 455.0], [21.7, 456.0], [21.8, 456.0], [21.9, 456.0], [22.0, 456.0], [22.1, 456.0], [22.2, 456.0], [22.3, 456.0], [22.4, 456.0], [22.5, 456.0], [22.6, 457.0], [22.7, 457.0], [22.8, 457.0], [22.9, 457.0], [23.0, 457.0], [23.1, 457.0], [23.2, 457.0], [23.3, 458.0], [23.4, 458.0], [23.5, 458.0], [23.6, 458.0], [23.7, 458.0], [23.8, 458.0], [23.9, 459.0], [24.0, 459.0], [24.1, 459.0], [24.2, 459.0], [24.3, 459.0], [24.4, 459.0], [24.5, 459.0], [24.6, 459.0], [24.7, 459.0], [24.8, 460.0], [24.9, 460.0], [25.0, 461.0], [25.1, 461.0], [25.2, 461.0], [25.3, 462.0], [25.4, 462.0], [25.5, 462.0], [25.6, 462.0], [25.7, 462.0], [25.8, 462.0], [25.9, 463.0], [26.0, 463.0], [26.1, 463.0], [26.2, 463.0], [26.3, 463.0], [26.4, 463.0], [26.5, 463.0], [26.6, 463.0], [26.7, 464.0], [26.8, 464.0], [26.9, 464.0], [27.0, 464.0], [27.1, 464.0], [27.2, 464.0], [27.3, 465.0], [27.4, 465.0], [27.5, 465.0], [27.6, 465.0], [27.7, 465.0], [27.8, 466.0], [27.9, 466.0], [28.0, 466.0], [28.1, 466.0], [28.2, 466.0], [28.3, 466.0], [28.4, 467.0], [28.5, 467.0], [28.6, 467.0], [28.7, 467.0], [28.8, 467.0], [28.9, 468.0], [29.0, 468.0], [29.1, 468.0], [29.2, 468.0], [29.3, 468.0], [29.4, 468.0], [29.5, 468.0], [29.6, 469.0], [29.7, 469.0], [29.8, 469.0], [29.9, 469.0], [30.0, 469.0], [30.1, 469.0], [30.2, 469.0], [30.3, 469.0], [30.4, 470.0], [30.5, 470.0], [30.6, 470.0], [30.7, 470.0], [30.8, 470.0], [30.9, 471.0], [31.0, 471.0], [31.1, 471.0], [31.2, 471.0], [31.3, 471.0], [31.4, 471.0], [31.5, 471.0], [31.6, 472.0], [31.7, 472.0], [31.8, 472.0], [31.9, 472.0], [32.0, 472.0], [32.1, 473.0], [32.2, 473.0], [32.3, 473.0], [32.4, 473.0], [32.5, 473.0], [32.6, 474.0], [32.7, 474.0], [32.8, 474.0], [32.9, 474.0], [33.0, 475.0], [33.1, 475.0], [33.2, 476.0], [33.3, 476.0], [33.4, 477.0], [33.5, 477.0], [33.6, 477.0], [33.7, 478.0], [33.8, 478.0], [33.9, 478.0], [34.0, 478.0], [34.1, 479.0], [34.2, 479.0], [34.3, 479.0], [34.4, 479.0], [34.5, 480.0], [34.6, 480.0], [34.7, 480.0], [34.8, 481.0], [34.9, 481.0], [35.0, 481.0], [35.1, 482.0], [35.2, 482.0], [35.3, 482.0], [35.4, 482.0], [35.5, 482.0], [35.6, 482.0], [35.7, 483.0], [35.8, 483.0], [35.9, 483.0], [36.0, 483.0], [36.1, 483.0], [36.2, 483.0], [36.3, 483.0], [36.4, 483.0], [36.5, 484.0], [36.6, 484.0], [36.7, 485.0], [36.8, 485.0], [36.9, 485.0], [37.0, 485.0], [37.1, 486.0], [37.2, 486.0], [37.3, 486.0], [37.4, 486.0], [37.5, 486.0], [37.6, 487.0], [37.7, 487.0], [37.8, 487.0], [37.9, 488.0], [38.0, 488.0], [38.1, 488.0], [38.2, 488.0], [38.3, 489.0], [38.4, 489.0], [38.5, 489.0], [38.6, 490.0], [38.7, 490.0], [38.8, 490.0], [38.9, 490.0], [39.0, 490.0], [39.1, 491.0], [39.2, 491.0], [39.3, 491.0], [39.4, 492.0], [39.5, 492.0], [39.6, 492.0], [39.7, 492.0], [39.8, 492.0], [39.9, 493.0], [40.0, 493.0], [40.1, 493.0], [40.2, 493.0], [40.3, 493.0], [40.4, 493.0], [40.5, 493.0], [40.6, 493.0], [40.7, 493.0], [40.8, 494.0], [40.9, 494.0], [41.0, 494.0], [41.1, 494.0], [41.2, 494.0], [41.3, 494.0], [41.4, 494.0], [41.5, 495.0], [41.6, 495.0], [41.7, 495.0], [41.8, 495.0], [41.9, 495.0], [42.0, 495.0], [42.1, 495.0], [42.2, 496.0], [42.3, 496.0], [42.4, 496.0], [42.5, 496.0], [42.6, 496.0], [42.7, 496.0], [42.8, 496.0], [42.9, 496.0], [43.0, 497.0], [43.1, 497.0], [43.2, 497.0], [43.3, 497.0], [43.4, 497.0], [43.5, 497.0], [43.6, 497.0], [43.7, 497.0], [43.8, 497.0], [43.9, 498.0], [44.0, 498.0], [44.1, 498.0], [44.2, 498.0], [44.3, 498.0], [44.4, 498.0], [44.5, 499.0], [44.6, 499.0], [44.7, 499.0], [44.8, 499.0], [44.9, 500.0], [45.0, 500.0], [45.1, 500.0], [45.2, 500.0], [45.3, 501.0], [45.4, 501.0], [45.5, 501.0], [45.6, 501.0], [45.7, 502.0], [45.8, 502.0], [45.9, 502.0], [46.0, 504.0], [46.1, 504.0], [46.2, 504.0], [46.3, 505.0], [46.4, 505.0], [46.5, 505.0], [46.6, 505.0], [46.7, 505.0], [46.8, 506.0], [46.9, 506.0], [47.0, 506.0], [47.1, 507.0], [47.2, 507.0], [47.3, 507.0], [47.4, 508.0], [47.5, 509.0], [47.6, 509.0], [47.7, 510.0], [47.8, 511.0], [47.9, 512.0], [48.0, 513.0], [48.1, 513.0], [48.2, 514.0], [48.3, 518.0], [48.4, 519.0], [48.5, 521.0], [48.6, 522.0], [48.7, 523.0], [48.8, 524.0], [48.9, 525.0], [49.0, 525.0], [49.1, 526.0], [49.2, 527.0], [49.3, 529.0], [49.4, 531.0], [49.5, 531.0], [49.6, 532.0], [49.7, 532.0], [49.8, 532.0], [49.9, 533.0], [50.0, 533.0], [50.1, 533.0], [50.2, 534.0], [50.3, 534.0], [50.4, 535.0], [50.5, 535.0], [50.6, 536.0], [50.7, 537.0], [50.8, 537.0], [50.9, 537.0], [51.0, 538.0], [51.1, 538.0], [51.2, 538.0], [51.3, 539.0], [51.4, 539.0], [51.5, 539.0], [51.6, 540.0], [51.7, 540.0], [51.8, 541.0], [51.9, 542.0], [52.0, 543.0], [52.1, 543.0], [52.2, 543.0], [52.3, 544.0], [52.4, 544.0], [52.5, 545.0], [52.6, 545.0], [52.7, 546.0], [52.8, 546.0], [52.9, 547.0], [53.0, 548.0], [53.1, 549.0], [53.2, 551.0], [53.3, 552.0], [53.4, 552.0], [53.5, 553.0], [53.6, 553.0], [53.7, 554.0], [53.8, 555.0], [53.9, 555.0], [54.0, 555.0], [54.1, 556.0], [54.2, 556.0], [54.3, 556.0], [54.4, 557.0], [54.5, 559.0], [54.6, 559.0], [54.7, 560.0], [54.8, 560.0], [54.9, 560.0], [55.0, 561.0], [55.1, 561.0], [55.2, 562.0], [55.3, 562.0], [55.4, 563.0], [55.5, 563.0], [55.6, 563.0], [55.7, 563.0], [55.8, 564.0], [55.9, 564.0], [56.0, 564.0], [56.1, 564.0], [56.2, 564.0], [56.3, 564.0], [56.4, 565.0], [56.5, 565.0], [56.6, 566.0], [56.7, 566.0], [56.8, 566.0], [56.9, 567.0], [57.0, 567.0], [57.1, 567.0], [57.2, 568.0], [57.3, 568.0], [57.4, 568.0], [57.5, 569.0], [57.6, 569.0], [57.7, 570.0], [57.8, 570.0], [57.9, 571.0], [58.0, 571.0], [58.1, 571.0], [58.2, 571.0], [58.3, 572.0], [58.4, 572.0], [58.5, 573.0], [58.6, 575.0], [58.7, 576.0], [58.8, 577.0], [58.9, 577.0], [59.0, 578.0], [59.1, 578.0], [59.2, 578.0], [59.3, 579.0], [59.4, 579.0], [59.5, 579.0], [59.6, 580.0], [59.7, 580.0], [59.8, 581.0], [59.9, 581.0], [60.0, 581.0], [60.1, 582.0], [60.2, 582.0], [60.3, 582.0], [60.4, 583.0], [60.5, 583.0], [60.6, 583.0], [60.7, 584.0], [60.8, 584.0], [60.9, 584.0], [61.0, 585.0], [61.1, 585.0], [61.2, 585.0], [61.3, 586.0], [61.4, 586.0], [61.5, 587.0], [61.6, 587.0], [61.7, 587.0], [61.8, 588.0], [61.9, 588.0], [62.0, 590.0], [62.1, 591.0], [62.2, 591.0], [62.3, 592.0], [62.4, 592.0], [62.5, 594.0], [62.6, 596.0], [62.7, 598.0], [62.8, 598.0], [62.9, 598.0], [63.0, 599.0], [63.1, 599.0], [63.2, 603.0], [63.3, 604.0], [63.4, 604.0], [63.5, 605.0], [63.6, 606.0], [63.7, 608.0], [63.8, 609.0], [63.9, 610.0], [64.0, 611.0], [64.1, 612.0], [64.2, 613.0], [64.3, 614.0], [64.4, 615.0], [64.5, 615.0], [64.6, 616.0], [64.7, 617.0], [64.8, 617.0], [64.9, 617.0], [65.0, 618.0], [65.1, 619.0], [65.2, 620.0], [65.3, 622.0], [65.4, 622.0], [65.5, 623.0], [65.6, 626.0], [65.7, 626.0], [65.8, 627.0], [65.9, 627.0], [66.0, 628.0], [66.1, 629.0], [66.2, 629.0], [66.3, 629.0], [66.4, 630.0], [66.5, 630.0], [66.6, 631.0], [66.7, 631.0], [66.8, 631.0], [66.9, 632.0], [67.0, 632.0], [67.1, 633.0], [67.2, 633.0], [67.3, 635.0], [67.4, 636.0], [67.5, 637.0], [67.6, 637.0], [67.7, 637.0], [67.8, 638.0], [67.9, 638.0], [68.0, 638.0], [68.1, 639.0], [68.2, 639.0], [68.3, 639.0], [68.4, 639.0], [68.5, 640.0], [68.6, 640.0], [68.7, 640.0], [68.8, 641.0], [68.9, 642.0], [69.0, 643.0], [69.1, 643.0], [69.2, 644.0], [69.3, 644.0], [69.4, 645.0], [69.5, 647.0], [69.6, 648.0], [69.7, 649.0], [69.8, 649.0], [69.9, 650.0], [70.0, 650.0], [70.1, 650.0], [70.2, 651.0], [70.3, 653.0], [70.4, 653.0], [70.5, 654.0], [70.6, 654.0], [70.7, 654.0], [70.8, 655.0], [70.9, 655.0], [71.0, 656.0], [71.1, 656.0], [71.2, 656.0], [71.3, 657.0], [71.4, 657.0], [71.5, 658.0], [71.6, 661.0], [71.7, 664.0], [71.8, 666.0], [71.9, 671.0], [72.0, 671.0], [72.1, 672.0], [72.2, 672.0], [72.3, 673.0], [72.4, 673.0], [72.5, 673.0], [72.6, 673.0], [72.7, 674.0], [72.8, 674.0], [72.9, 674.0], [73.0, 675.0], [73.1, 675.0], [73.2, 676.0], [73.3, 676.0], [73.4, 676.0], [73.5, 677.0], [73.6, 677.0], [73.7, 677.0], [73.8, 677.0], [73.9, 678.0], [74.0, 678.0], [74.1, 678.0], [74.2, 679.0], [74.3, 679.0], [74.4, 679.0], [74.5, 680.0], [74.6, 680.0], [74.7, 681.0], [74.8, 682.0], [74.9, 683.0], [75.0, 683.0], [75.1, 684.0], [75.2, 685.0], [75.3, 685.0], [75.4, 686.0], [75.5, 687.0], [75.6, 688.0], [75.7, 688.0], [75.8, 689.0], [75.9, 690.0], [76.0, 693.0], [76.1, 695.0], [76.2, 696.0], [76.3, 697.0], [76.4, 698.0], [76.5, 699.0], [76.6, 700.0], [76.7, 701.0], [76.8, 703.0], [76.9, 704.0], [77.0, 704.0], [77.1, 704.0], [77.2, 705.0], [77.3, 705.0], [77.4, 706.0], [77.5, 706.0], [77.6, 707.0], [77.7, 708.0], [77.8, 709.0], [77.9, 711.0], [78.0, 711.0], [78.1, 712.0], [78.2, 721.0], [78.3, 722.0], [78.4, 723.0], [78.5, 724.0], [78.6, 725.0], [78.7, 727.0], [78.8, 727.0], [78.9, 728.0], [79.0, 729.0], [79.1, 729.0], [79.2, 730.0], [79.3, 730.0], [79.4, 731.0], [79.5, 731.0], [79.6, 731.0], [79.7, 732.0], [79.8, 733.0], [79.9, 734.0], [80.0, 735.0], [80.1, 736.0], [80.2, 736.0], [80.3, 737.0], [80.4, 738.0], [80.5, 738.0], [80.6, 738.0], [80.7, 739.0], [80.8, 739.0], [80.9, 739.0], [81.0, 739.0], [81.1, 746.0], [81.2, 752.0], [81.3, 755.0], [81.4, 759.0], [81.5, 759.0], [81.6, 761.0], [81.7, 762.0], [81.8, 763.0], [81.9, 763.0], [82.0, 764.0], [82.1, 772.0], [82.2, 774.0], [82.3, 775.0], [82.4, 777.0], [82.5, 780.0], [82.6, 784.0], [82.7, 786.0], [82.8, 786.0], [82.9, 787.0], [83.0, 789.0], [83.1, 790.0], [83.2, 791.0], [83.3, 794.0], [83.4, 796.0], [83.5, 796.0], [83.6, 797.0], [83.7, 797.0], [83.8, 798.0], [83.9, 799.0], [84.0, 800.0], [84.1, 802.0], [84.2, 802.0], [84.3, 803.0], [84.4, 803.0], [84.5, 804.0], [84.6, 804.0], [84.7, 805.0], [84.8, 805.0], [84.9, 806.0], [85.0, 807.0], [85.1, 809.0], [85.2, 810.0], [85.3, 812.0], [85.4, 815.0], [85.5, 818.0], [85.6, 824.0], [85.7, 828.0], [85.8, 828.0], [85.9, 829.0], [86.0, 831.0], [86.1, 831.0], [86.2, 832.0], [86.3, 832.0], [86.4, 833.0], [86.5, 834.0], [86.6, 835.0], [86.7, 836.0], [86.8, 836.0], [86.9, 837.0], [87.0, 838.0], [87.1, 839.0], [87.2, 840.0], [87.3, 841.0], [87.4, 841.0], [87.5, 842.0], [87.6, 843.0], [87.7, 843.0], [87.8, 844.0], [87.9, 844.0], [88.0, 845.0], [88.1, 845.0], [88.2, 845.0], [88.3, 845.0], [88.4, 845.0], [88.5, 845.0], [88.6, 846.0], [88.7, 846.0], [88.8, 847.0], [88.9, 849.0], [89.0, 850.0], [89.1, 860.0], [89.2, 864.0], [89.3, 866.0], [89.4, 868.0], [89.5, 868.0], [89.6, 868.0], [89.7, 869.0], [89.8, 869.0], [89.9, 869.0], [90.0, 870.0], [90.1, 872.0], [90.2, 873.0], [90.3, 874.0], [90.4, 876.0], [90.5, 878.0], [90.6, 881.0], [90.7, 883.0], [90.8, 884.0], [90.9, 885.0], [91.0, 886.0], [91.1, 890.0], [91.2, 892.0], [91.3, 903.0], [91.4, 911.0], [91.5, 915.0], [91.6, 917.0], [91.7, 918.0], [91.8, 919.0], [91.9, 919.0], [92.0, 921.0], [92.1, 923.0], [92.2, 924.0], [92.3, 929.0], [92.4, 932.0], [92.5, 933.0], [92.6, 936.0], [92.7, 938.0], [92.8, 956.0], [92.9, 960.0], [93.0, 962.0], [93.1, 963.0], [93.2, 964.0], [93.3, 966.0], [93.4, 970.0], [93.5, 972.0], [93.6, 973.0], [93.7, 974.0], [93.8, 976.0], [93.9, 982.0], [94.0, 984.0], [94.1, 985.0], [94.2, 986.0], [94.3, 986.0], [94.4, 1000.0], [94.5, 1001.0], [94.6, 1004.0], [94.7, 1043.0], [94.8, 1047.0], [94.9, 1050.0], [95.0, 1055.0], [95.1, 1057.0], [95.2, 1058.0], [95.3, 1085.0], [95.4, 1087.0], [95.5, 1094.0], [95.6, 1095.0], [95.7, 1096.0], [95.8, 1100.0], [95.9, 1113.0], [96.0, 1115.0], [96.1, 1116.0], [96.2, 1117.0], [96.3, 1121.0], [96.4, 1126.0], [96.5, 1130.0], [96.6, 1139.0], [96.7, 1143.0], [96.8, 1144.0], [96.9, 1149.0], [97.0, 1149.0], [97.1, 1176.0], [97.2, 1191.0], [97.3, 1193.0], [97.4, 1194.0], [97.5, 1195.0], [97.6, 1195.0], [97.7, 1196.0], [97.8, 1197.0], [97.9, 1200.0], [98.0, 1215.0], [98.1, 1223.0], [98.2, 1228.0], [98.3, 1237.0], [98.4, 1239.0], [98.5, 1240.0], [98.6, 1242.0], [98.7, 1243.0], [98.8, 1253.0], [98.9, 1257.0], [99.0, 1329.0], [99.1, 1331.0], [99.2, 1334.0], [99.3, 1378.0], [99.4, 1382.0], [99.5, 1395.0], [99.6, 1423.0], [99.7, 1431.0], [99.8, 1436.0], [99.9, 1695.0], [100.0, 16772.0]], "isOverall": false, "label": "GET - Fetch Events List", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 100.0, "title": "Response Time Percentiles"}},
        getOptions: function() {
            return {
                series: {
                    points: { show: false }
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentiles'
                },
                xaxis: {
                    tickDecimals: 1,
                    axisLabel: "Percentiles",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Percentile value in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : %x.2 percentile was %y ms"
                },
                selection: { mode: "xy" },
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentiles"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesPercentiles"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesPercentiles"), dataset, prepareOverviewOptions(options));
        }
};

/**
 * @param elementId Id of element where we display message
 */
function setEmptyGraph(elementId) {
    $(function() {
        $(elementId).text("No graph series with filter="+seriesFilter);
    });
}

// Response times percentiles
function refreshResponseTimePercentiles() {
    var infos = responseTimePercentilesInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimePercentiles");
        return;
    }
    if (isGraph($("#flotResponseTimesPercentiles"))){
        infos.createGraph();
    } else {
        var choiceContainer = $("#choicesResponseTimePercentiles");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesPercentiles", "#overviewResponseTimesPercentiles");
        $('#bodyResponseTimePercentiles .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimeDistributionInfos = {
        data: {"result": {"minY": 1.0, "minX": 0.0, "maxY": 6596.0, "series": [{"data": [[0.0, 874.0], [600.0, 2529.0], [700.0, 1397.0], [800.0, 1383.0], [900.0, 584.0], [15200.0, 1.0], [15300.0, 1.0], [15700.0, 1.0], [15600.0, 1.0], [1000.0, 265.0], [16300.0, 1.0], [16100.0, 1.0], [16700.0, 3.0], [1100.0, 390.0], [1200.0, 208.0], [1300.0, 101.0], [1400.0, 63.0], [1500.0, 2.0], [100.0, 293.0], [1600.0, 17.0], [1700.0, 1.0], [1900.0, 1.0], [200.0, 162.0], [300.0, 529.0], [400.0, 6596.0], [500.0, 3433.0]], "isOverall": false, "label": "GET - Fetch Events List", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 100, "maxX": 16700.0, "title": "Response Time Distribution"}},
        getOptions: function() {
            var granularity = this.data.result.granularity;
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    barWidth: this.data.result.granularity
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " responses for " + label + " were between " + xval + " and " + (xval + granularity) + " ms";
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimeDistribution"), prepareData(data.result.series, $("#choicesResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshResponseTimeDistribution() {
    var infos = responseTimeDistributionInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeDistribution");
        return;
    }
    if (isGraph($("#flotResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var syntheticResponseTimeDistributionInfos = {
        data: {"result": {"minY": 9.0, "minX": 0.0, "ticks": [[0, "Requests having \nresponse time <= 500ms"], [1, "Requests having \nresponse time > 500ms and <= 1,500ms"], [2, "Requests having \nresponse time > 1,500ms"], [3, "Requests in error"]], "maxY": 10277.0, "series": [{"data": [[0.0, 8530.0]], "color": "#9ACD32", "isOverall": false, "label": "Requests having \nresponse time <= 500ms", "isController": false}, {"data": [[1.0, 10277.0]], "color": "yellow", "isOverall": false, "label": "Requests having \nresponse time > 500ms and <= 1,500ms", "isController": false}, {"data": [[2.0, 21.0]], "color": "orange", "isOverall": false, "label": "Requests having \nresponse time > 1,500ms", "isController": false}, {"data": [[3.0, 9.0]], "color": "#FF6347", "isOverall": false, "label": "Requests in error", "isController": false}], "supportsControllersDiscrimination": false, "maxX": 3.0, "title": "Synthetic Response Times Distribution"}},
        getOptions: function() {
            return {
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendSyntheticResponseTimeDistribution'
                },
                xaxis:{
                    axisLabel: "Response times ranges",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                    tickLength:0,
                    min:-0.5,
                    max:3.5
                },
                yaxis: {
                    axisLabel: "Number of responses",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                bars : {
                    show: true,
                    align: "center",
                    barWidth: 0.25,
                    fill:.75
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: function(label, xval, yval, flotItem){
                        return yval + " " + label;
                    }
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var options = this.getOptions();
            prepareOptions(options, data);
            options.xaxis.ticks = data.result.ticks;
            $.plot($("#flotSyntheticResponseTimeDistribution"), prepareData(data.result.series, $("#choicesSyntheticResponseTimeDistribution")), options);
        }

};

// Response time distribution
function refreshSyntheticResponseTimeDistribution() {
    var infos = syntheticResponseTimeDistributionInfos;
    prepareSeries(infos.data, true);
    if (isGraph($("#flotSyntheticResponseTimeDistribution"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        $('#footerSyntheticResponseTimeDistribution .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var activeThreadsOverTimeInfos = {
        data: {"result": {"minY": 180.7792998477928, "minX": 1.78638792E12, "maxY": 196.79005350960023, "series": [{"data": [[1.78638792E12, 180.7792998477928], [1.78638798E12, 196.79005350960023]], "isOverall": false, "label": "200 Users - Flash Sale", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.78638798E12, "title": "Active Threads Over Time"}},
        getOptions: function() {
            return {
                series: {
                    stack: true,
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 6,
                    show: true,
                    container: '#legendActiveThreadsOverTime'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                selection: {
                    mode: 'xy'
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : At %x there were %y active threads"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesActiveThreadsOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotActiveThreadsOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewActiveThreadsOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Active Threads Over Time
function refreshActiveThreadsOverTime(fixTimestamps) {
    var infos = activeThreadsOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotActiveThreadsOverTime"))) {
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesActiveThreadsOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotActiveThreadsOverTime", "#overviewActiveThreadsOverTime");
        $('#footerActiveThreadsOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var timeVsThreadsInfos = {
        data: {"result": {"minY": 52.87499999999999, "minX": 1.0, "maxY": 1101.0892857142862, "series": [{"data": [[2.0, 255.0], [4.0, 256.5], [6.0, 240.5], [7.0, 252.0], [11.0, 256.75], [12.0, 257.0], [13.0, 388.0], [17.0, 386.0], [19.0, 386.5], [22.0, 385.0], [23.0, 384.5], [25.0, 385.0], [26.0, 389.5], [27.0, 392.0], [29.0, 386.0], [31.0, 390.0], [33.0, 390.5], [34.0, 883.1333333333333], [35.0, 502.2], [36.0, 156.09999999999997], [37.0, 151.66666666666669], [38.0, 125.66666666666669], [39.0, 71.80701754385964], [41.0, 109.84374999999997], [42.0, 52.87499999999999], [43.0, 111.27777777777777], [44.0, 85.6875], [45.0, 85.39393939393942], [46.0, 93.33333333333333], [47.0, 130.66666666666669], [48.0, 88.2], [49.0, 99.82142857142858], [50.0, 87.88888888888887], [51.0, 123.51612903225808], [52.0, 81.31428571428573], [53.0, 103.10344827586208], [54.0, 86.39285714285714], [55.0, 75.77966101694915], [57.0, 83.82558139534885], [59.0, 72.11538461538461], [58.0, 460.6666666666667], [60.0, 76.6], [61.0, 92.60000000000001], [63.0, 130.10526315789474], [65.0, 71.70689655172414], [66.0, 82.40000000000002], [67.0, 83.36363636363632], [68.0, 77.26470588235294], [69.0, 74.30357142857144], [70.0, 79.75862068965517], [71.0, 61.5], [72.0, 66.2258064516129], [73.0, 91.62295081967213], [77.0, 172.19354838709677], [79.0, 451.0], [76.0, 451.75], [83.0, 449.0], [82.0, 450.0], [85.0, 435.05882352941177], [86.0, 429.734693877551], [87.0, 447.0], [84.0, 449.0], [89.0, 280.8421052631579], [91.0, 445.5], [92.0, 331.80701754385956], [93.0, 349.75], [94.0, 443.0], [99.0, 439.5], [97.0, 440.0], [101.0, 438.5], [106.0, 720.8780487804878], [107.0, 817.2195121951218], [104.0, 437.0], [108.0, 476.7142857142857], [111.0, 657.8333333333334], [110.0, 517.5], [113.0, 372.6666666666667], [114.0, 380.60869565217394], [115.0, 444.39285714285717], [116.0, 446.1153846153846], [118.0, 512.0], [120.0, 305.84000000000003], [121.0, 394.34545454545463], [123.0, 360.1666666666667], [127.0, 513.0], [126.0, 513.0], [125.0, 513.0], [131.0, 568.4137931034484], [133.0, 586.7857142857144], [134.0, 723.8392857142858], [132.0, 511.6666666666667], [129.0, 512.3333333333334], [138.0, 296.5806451612903], [142.0, 465.14444444444433], [143.0, 509.0], [140.0, 510.0], [136.0, 511.25], [145.0, 373.27272727272725], [148.0, 355.87499999999994], [150.0, 506.0], [147.0, 507.5], [153.0, 595.5806451612904], [154.0, 616.7647058823528], [157.0, 596.9999999999999], [158.0, 756.6842105263157], [159.0, 501.5], [155.0, 502.3333333333333], [152.0, 503.0], [161.0, 408.4166666666666], [164.0, 476.6666666666667], [166.0, 477.2564102564102], [167.0, 496.0], [163.0, 498.0], [162.0, 500.0], [168.0, 701.4444444444443], [170.0, 488.2051282051281], [174.0, 494.25], [169.0, 495.0], [176.0, 635.948717948718], [178.0, 659.9767441860464], [183.0, 491.25], [180.0, 492.3333333333333], [177.0, 493.25], [186.0, 859.05], [190.0, 738.6190476190476], [187.0, 489.3333333333333], [193.0, 799.5853658536585], [195.0, 1101.0892857142862], [198.0, 612.2727272727271], [197.0, 464.3333333333333], [196.0, 465.25], [192.0, 480.1428571428571], [200.0, 625.6472704714627], [1.0, 286.0]], "isOverall": false, "label": "GET - Fetch Events List", "isController": false}, {"data": [[186.17991187556436, 586.472633646543]], "isOverall": false, "label": "GET - Fetch Events List-Aggregated", "isController": false}], "supportsControllersDiscrimination": true, "maxX": 200.0, "title": "Time VS Threads"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    axisLabel: "Number of active threads",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response times in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: { noColumns: 2,show: true, container: '#legendTimeVsThreads' },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s: At %x.2 active threads, Average response time was %y.2 ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesTimeVsThreads"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotTimesVsThreads"), dataset, options);
            // setup overview
            $.plot($("#overviewTimesVsThreads"), dataset, prepareOverviewOptions(options));
        }
};

// Time vs threads
function refreshTimeVsThreads(){
    var infos = timeVsThreadsInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTimeVsThreads");
        return;
    }
    if(isGraph($("#flotTimesVsThreads"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTimeVsThreads");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTimesVsThreads", "#overviewTimesVsThreads");
        $('#footerTimeVsThreads .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var bytesThroughputOverTimeInfos = {
        data : {"result": {"minY": 16096.8, "minX": 1.78638792E12, "maxY": 1360949.85, "series": [{"data": [[1.78638792E12, 1360949.85], [1.78638798E12, 693221.4]], "isOverall": false, "label": "Bytes received per second", "isController": false}, {"data": [[1.78638792E12, 31623.6], [1.78638798E12, 16096.8]], "isOverall": false, "label": "Bytes sent per second", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.78638798E12, "title": "Bytes Throughput Over Time"}},
        getOptions : function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity) ,
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Bytes / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendBytesThroughputOverTime'
                },
                selection: {
                    mode: "xy"
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y"
                }
            };
        },
        createGraph : function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesBytesThroughputOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotBytesThroughputOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewBytesThroughputOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Bytes throughput Over Time
function refreshBytesThroughputOverTime(fixTimestamps) {
    var infos = bytesThroughputOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotBytesThroughputOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesBytesThroughputOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotBytesThroughputOverTime", "#overviewBytesThroughputOverTime");
        $('#footerBytesThroughputOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var responseTimesOverTimeInfos = {
        data: {"result": {"minY": 540.7033364809546, "minX": 1.78638792E12, "maxY": 609.7697668829587, "series": [{"data": [[1.78638792E12, 609.7697668829587], [1.78638798E12, 540.7033364809546]], "isOverall": false, "label": "GET - Fetch Events List", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.78638798E12, "title": "Response Time Over Time"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average response time was %y ms"
                }
            };
        },
        createGraph: function() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Times Over Time
function refreshResponseTimeOverTime(fixTimestamps) {
    var infos = responseTimesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyResponseTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotResponseTimesOverTime"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimesOverTime", "#overviewResponseTimesOverTime");
        $('#footerResponseTimesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var latenciesOverTimeInfos = {
        data: {"result": {"minY": 540.689486937362, "minX": 1.78638792E12, "maxY": 609.7294720820323, "series": [{"data": [[1.78638792E12, 609.7294720820323], [1.78638798E12, 540.689486937362]], "isOverall": false, "label": "GET - Fetch Events List", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.78638798E12, "title": "Latencies Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average response latencies in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendLatenciesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average latency was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesLatenciesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotLatenciesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewLatenciesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Latencies Over Time
function refreshLatenciesOverTime(fixTimestamps) {
    var infos = latenciesOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyLatenciesOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotLatenciesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesLatenciesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotLatenciesOverTime", "#overviewLatenciesOverTime");
        $('#footerLatenciesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var connectTimeOverTimeInfos = {
        data: {"result": {"minY": 0.0, "minX": 1.78638792E12, "maxY": 0.10189858207161734, "series": [{"data": [[1.78638792E12, 0.10189858207161734], [1.78638798E12, 0.0]], "isOverall": false, "label": "GET - Fetch Events List", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.78638798E12, "title": "Connect Time Over Time"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getConnectTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Average Connect Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendConnectTimeOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Average connect time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesConnectTimeOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotConnectTimeOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewConnectTimeOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Connect Time Over Time
function refreshConnectTimeOverTime(fixTimestamps) {
    var infos = connectTimeOverTimeInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyConnectTimeOverTime");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotConnectTimeOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesConnectTimeOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotConnectTimeOverTime", "#overviewConnectTimeOverTime");
        $('#footerConnectTimeOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var responseTimePercentilesOverTimeInfos = {
        data: {"result": {"minY": 24.0, "minX": 1.78638792E12, "maxY": 1909.0, "series": [{"data": [[1.78638792E12, 1909.0], [1.78638798E12, 878.0]], "isOverall": false, "label": "Max", "isController": false}, {"data": [[1.78638792E12, 24.0], [1.78638798E12, 239.0]], "isOverall": false, "label": "Min", "isController": false}, {"data": [[1.78638792E12, 968.5], [1.78638798E12, 676.0]], "isOverall": false, "label": "90th percentile", "isController": false}, {"data": [[1.78638792E12, 1378.0], [1.78638798E12, 869.0]], "isOverall": false, "label": "99th percentile", "isController": false}, {"data": [[1.78638792E12, 563.0], [1.78638798E12, 497.0]], "isOverall": false, "label": "Median", "isController": false}, {"data": [[1.78638792E12, 1141.0], [1.78638798E12, 704.0]], "isOverall": false, "label": "95th percentile", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.78638798E12, "title": "Response Time Percentiles Over Time (successful requests only)"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true,
                        fill: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Response Time in ms",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: '#legendResponseTimePercentilesOverTime'
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s : at %x Response time was %y ms"
                }
            };
        },
        createGraph: function () {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesResponseTimePercentilesOverTime"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotResponseTimePercentilesOverTime"), dataset, options);
            // setup overview
            $.plot($("#overviewResponseTimePercentilesOverTime"), dataset, prepareOverviewOptions(options));
        }
};

// Response Time Percentiles Over Time
function refreshResponseTimePercentilesOverTime(fixTimestamps) {
    var infos = responseTimePercentilesOverTimeInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotResponseTimePercentilesOverTime"))) {
        infos.createGraph();
    }else {
        var choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimePercentilesOverTime", "#overviewResponseTimePercentilesOverTime");
        $('#footerResponseTimePercentilesOverTime .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var responseTimeVsRequestInfos = {
    data: {"result": {"minY": 76.0, "minX": 54.0, "maxY": 16115.0, "series": [{"data": [[543.0, 83.0], [54.0, 389.0], [117.0, 322.0], [188.0, 605.0], [199.0, 696.0], [198.0, 1195.0], [200.0, 917.0], [210.0, 640.0], [221.0, 81.0], [219.0, 868.0], [231.0, 704.0], [234.0, 551.0], [239.0, 764.5], [246.0, 843.0], [255.0, 367.0], [248.0, 1043.5], [250.0, 789.0], [286.0, 841.0], [288.0, 537.5], [296.0, 569.0], [300.0, 521.5], [331.0, 636.0], [328.0, 632.0], [350.0, 561.5], [400.0, 491.0], [446.0, 799.0], [450.0, 456.0], [479.0, 76.0], [500.0, 410.0]], "isOverall": false, "label": "Successes", "isController": false}, {"data": [[286.0, 16087.0], [239.0, 16115.0]], "isOverall": false, "label": "Failures", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 543.0, "title": "Response Time Vs Request"}},
    getOptions: function() {
        return {
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Response Time in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: {
                noColumns: 2,
                show: true,
                container: '#legendResponseTimeVsRequest'
            },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median response time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesResponseTimeVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotResponseTimeVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewResponseTimeVsRequest"), dataset, prepareOverviewOptions(options));

    }
};

// Response Time vs Request
function refreshResponseTimeVsRequest() {
    var infos = responseTimeVsRequestInfos;
    prepareSeries(infos.data);
    if (isGraph($("#flotResponseTimeVsRequest"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesResponseTimeVsRequest");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotResponseTimeVsRequest", "#overviewResponseTimeVsRequest");
        $('#footerResponseRimeVsRequest .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};


var latenciesVsRequestInfos = {
    data: {"result": {"minY": 76.0, "minX": 54.0, "maxY": 16115.0, "series": [{"data": [[543.0, 83.0], [54.0, 389.0], [117.0, 322.0], [188.0, 605.0], [199.0, 695.5], [198.0, 1195.0], [200.0, 917.0], [210.0, 640.0], [221.0, 81.0], [219.0, 868.0], [231.0, 704.0], [234.0, 551.0], [239.0, 764.0], [246.0, 843.0], [255.0, 367.0], [248.0, 1043.5], [250.0, 789.0], [286.0, 841.0], [288.0, 537.5], [296.0, 569.0], [300.0, 521.5], [331.0, 636.0], [328.0, 632.0], [350.0, 561.5], [400.0, 491.0], [446.0, 799.0], [450.0, 456.0], [479.0, 76.0], [500.0, 410.0]], "isOverall": false, "label": "Successes", "isController": false}, {"data": [[286.0, 16087.0], [239.0, 16115.0]], "isOverall": false, "label": "Failures", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 1000, "maxX": 543.0, "title": "Latencies Vs Request"}},
    getOptions: function() {
        return{
            series: {
                lines: {
                    show: false
                },
                points: {
                    show: true
                }
            },
            xaxis: {
                axisLabel: "Global number of requests per second",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            yaxis: {
                axisLabel: "Median Latency in ms",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 20,
            },
            legend: { noColumns: 2,show: true, container: '#legendLatencyVsRequest' },
            selection: {
                mode: 'xy'
            },
            grid: {
                hoverable: true // IMPORTANT! this is needed for tooltip to work
            },
            tooltip: true,
            tooltipOpts: {
                content: "%s : Median Latency time at %x req/s was %y ms"
            },
            colors: ["#9ACD32", "#FF6347"]
        };
    },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesLatencyVsRequest"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotLatenciesVsRequest"), dataset, options);
        // setup overview
        $.plot($("#overviewLatenciesVsRequest"), dataset, prepareOverviewOptions(options));
    }
};

// Latencies vs Request
function refreshLatenciesVsRequest() {
        var infos = latenciesVsRequestInfos;
        prepareSeries(infos.data);
        if(isGraph($("#flotLatenciesVsRequest"))){
            infos.createGraph();
        }else{
            var choiceContainer = $("#choicesLatencyVsRequest");
            createLegend(choiceContainer, infos);
            infos.createGraph();
            setGraphZoomable("#flotLatenciesVsRequest", "#overviewLatenciesVsRequest");
            $('#footerLatenciesVsRequest .legendColorBox > div').each(function(i){
                $(this).clone().prependTo(choiceContainer.find("li").eq(i));
            });
        }
};

var hitsPerSecondInfos = {
        data: {"result": {"minY": 102.56666666666666, "minX": 1.78638792E12, "maxY": 211.38333333333333, "series": [{"data": [[1.78638792E12, 211.38333333333333], [1.78638798E12, 102.56666666666666]], "isOverall": false, "label": "hitsPerSecond", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.78638798E12, "title": "Hits Per Second"}},
        getOptions: function() {
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of hits / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendHitsPerSecond"
                },
                selection: {
                    mode : 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y.2 hits/sec"
                }
            };
        },
        createGraph: function createGraph() {
            var data = this.data;
            var dataset = prepareData(data.result.series, $("#choicesHitsPerSecond"));
            var options = this.getOptions();
            prepareOptions(options, data);
            $.plot($("#flotHitsPerSecond"), dataset, options);
            // setup overview
            $.plot($("#overviewHitsPerSecond"), dataset, prepareOverviewOptions(options));
        }
};

// Hits per second
function refreshHitsPerSecond(fixTimestamps) {
    var infos = hitsPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if (isGraph($("#flotHitsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesHitsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotHitsPerSecond", "#overviewHitsPerSecond");
        $('#footerHitsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
}

var codesPerSecondInfos = {
        data: {"result": {"minY": 0.15, "minX": 1.78638792E12, "maxY": 207.9, "series": [{"data": [[1.78638792E12, 207.9], [1.78638798E12, 105.9]], "isOverall": false, "label": "200", "isController": false}, {"data": [[1.78638792E12, 0.15]], "isOverall": false, "label": "500", "isController": false}], "supportsControllersDiscrimination": false, "granularity": 60000, "maxX": 1.78638798E12, "title": "Codes Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of responses / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendCodesPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "Number of Response Codes %s at %x was %y.2 responses / sec"
                }
            };
        },
    createGraph: function() {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesCodesPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotCodesPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewCodesPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Codes per second
function refreshCodesPerSecond(fixTimestamps) {
    var infos = codesPerSecondInfos;
    prepareSeries(infos.data);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotCodesPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesCodesPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotCodesPerSecond", "#overviewCodesPerSecond");
        $('#footerCodesPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var transactionsPerSecondInfos = {
        data: {"result": {"minY": 0.15, "minX": 1.78638792E12, "maxY": 207.9, "series": [{"data": [[1.78638792E12, 207.9], [1.78638798E12, 105.9]], "isOverall": false, "label": "GET - Fetch Events List-success", "isController": false}, {"data": [[1.78638792E12, 0.15]], "isOverall": false, "label": "GET - Fetch Events List-failure", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.78638798E12, "title": "Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTransactionsPerSecond"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                }
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTransactionsPerSecond"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTransactionsPerSecond"), dataset, options);
        // setup overview
        $.plot($("#overviewTransactionsPerSecond"), dataset, prepareOverviewOptions(options));
    }
};

// Transactions per second
function refreshTransactionsPerSecond(fixTimestamps) {
    var infos = transactionsPerSecondInfos;
    prepareSeries(infos.data);
    if(infos.data.result.series.length == 0) {
        setEmptyGraph("#bodyTransactionsPerSecond");
        return;
    }
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotTransactionsPerSecond"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTransactionsPerSecond");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTransactionsPerSecond", "#overviewTransactionsPerSecond");
        $('#footerTransactionsPerSecond .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

var totalTPSInfos = {
        data: {"result": {"minY": 0.15, "minX": 1.78638792E12, "maxY": 207.9, "series": [{"data": [[1.78638792E12, 207.9], [1.78638798E12, 105.9]], "isOverall": false, "label": "Transaction-success", "isController": false}, {"data": [[1.78638792E12, 0.15]], "isOverall": false, "label": "Transaction-failure", "isController": false}], "supportsControllersDiscrimination": true, "granularity": 60000, "maxX": 1.78638798E12, "title": "Total Transactions Per Second"}},
        getOptions: function(){
            return {
                series: {
                    lines: {
                        show: true
                    },
                    points: {
                        show: true
                    }
                },
                xaxis: {
                    mode: "time",
                    timeformat: getTimeFormat(this.data.result.granularity),
                    axisLabel: getElapsedTimeLabel(this.data.result.granularity),
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20,
                },
                yaxis: {
                    axisLabel: "Number of transactions / sec",
                    axisLabelUseCanvas: true,
                    axisLabelFontSizePixels: 12,
                    axisLabelFontFamily: 'Verdana, Arial',
                    axisLabelPadding: 20
                },
                legend: {
                    noColumns: 2,
                    show: true,
                    container: "#legendTotalTPS"
                },
                selection: {
                    mode: 'xy'
                },
                grid: {
                    hoverable: true // IMPORTANT! this is needed for tooltip to
                                    // work
                },
                tooltip: true,
                tooltipOpts: {
                    content: "%s at %x was %y transactions / sec"
                },
                colors: ["#9ACD32", "#FF6347"]
            };
        },
    createGraph: function () {
        var data = this.data;
        var dataset = prepareData(data.result.series, $("#choicesTotalTPS"));
        var options = this.getOptions();
        prepareOptions(options, data);
        $.plot($("#flotTotalTPS"), dataset, options);
        // setup overview
        $.plot($("#overviewTotalTPS"), dataset, prepareOverviewOptions(options));
    }
};

// Total Transactions per second
function refreshTotalTPS(fixTimestamps) {
    var infos = totalTPSInfos;
    // We want to ignore seriesFilter
    prepareSeries(infos.data, false, true);
    if(fixTimestamps) {
        fixTimeStamps(infos.data.result.series, 25200000);
    }
    if(isGraph($("#flotTotalTPS"))){
        infos.createGraph();
    }else{
        var choiceContainer = $("#choicesTotalTPS");
        createLegend(choiceContainer, infos);
        infos.createGraph();
        setGraphZoomable("#flotTotalTPS", "#overviewTotalTPS");
        $('#footerTotalTPS .legendColorBox > div').each(function(i){
            $(this).clone().prependTo(choiceContainer.find("li").eq(i));
        });
    }
};

// Collapse the graph matching the specified DOM element depending the collapsed
// status
function collapse(elem, collapsed){
    if(collapsed){
        $(elem).parent().find(".fa-chevron-up").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(elem).parent().find(".fa-chevron-down").removeClass("fa-chevron-down").addClass("fa-chevron-up");
        if (elem.id == "bodyBytesThroughputOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshBytesThroughputOverTime(true);
            }
            document.location.href="#bytesThroughputOverTime";
        } else if (elem.id == "bodyLatenciesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesOverTime(true);
            }
            document.location.href="#latenciesOverTime";
        } else if (elem.id == "bodyCustomGraph") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCustomGraph(true);
            }
            document.location.href="#responseCustomGraph";
        } else if (elem.id == "bodyConnectTimeOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshConnectTimeOverTime(true);
            }
            document.location.href="#connectTimeOverTime";
        } else if (elem.id == "bodyResponseTimePercentilesOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimePercentilesOverTime(true);
            }
            document.location.href="#responseTimePercentilesOverTime";
        } else if (elem.id == "bodyResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeDistribution();
            }
            document.location.href="#responseTimeDistribution" ;
        } else if (elem.id == "bodySyntheticResponseTimeDistribution") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshSyntheticResponseTimeDistribution();
            }
            document.location.href="#syntheticResponseTimeDistribution" ;
        } else if (elem.id == "bodyActiveThreadsOverTime") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshActiveThreadsOverTime(true);
            }
            document.location.href="#activeThreadsOverTime";
        } else if (elem.id == "bodyTimeVsThreads") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTimeVsThreads();
            }
            document.location.href="#timeVsThreads" ;
        } else if (elem.id == "bodyCodesPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshCodesPerSecond(true);
            }
            document.location.href="#codesPerSecond";
        } else if (elem.id == "bodyTransactionsPerSecond") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTransactionsPerSecond(true);
            }
            document.location.href="#transactionsPerSecond";
        } else if (elem.id == "bodyTotalTPS") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshTotalTPS(true);
            }
            document.location.href="#totalTPS";
        } else if (elem.id == "bodyResponseTimeVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshResponseTimeVsRequest();
            }
            document.location.href="#responseTimeVsRequest";
        } else if (elem.id == "bodyLatenciesVsRequest") {
            if (isGraph($(elem).find('.flot-chart-content')) == false) {
                refreshLatenciesVsRequest();
            }
            document.location.href="#latencyVsRequest";
        }
    }
}

/*
 * Activates or deactivates all series of the specified graph (represented by id parameter)
 * depending on checked argument.
 */
function toggleAll(id, checked){
    var placeholder = document.getElementById(id);

    var cases = $(placeholder).find(':checkbox');
    cases.prop('checked', checked);
    $(cases).parent().children().children().toggleClass("legend-disabled", !checked);

    var choiceContainer;
    if ( id == "choicesBytesThroughputOverTime"){
        choiceContainer = $("#choicesBytesThroughputOverTime");
        refreshBytesThroughputOverTime(false);
    } else if(id == "choicesResponseTimesOverTime"){
        choiceContainer = $("#choicesResponseTimesOverTime");
        refreshResponseTimeOverTime(false);
    }else if(id == "choicesResponseCustomGraph"){
        choiceContainer = $("#choicesResponseCustomGraph");
        refreshCustomGraph(false);
    } else if ( id == "choicesLatenciesOverTime"){
        choiceContainer = $("#choicesLatenciesOverTime");
        refreshLatenciesOverTime(false);
    } else if ( id == "choicesConnectTimeOverTime"){
        choiceContainer = $("#choicesConnectTimeOverTime");
        refreshConnectTimeOverTime(false);
    } else if ( id == "choicesResponseTimePercentilesOverTime"){
        choiceContainer = $("#choicesResponseTimePercentilesOverTime");
        refreshResponseTimePercentilesOverTime(false);
    } else if ( id == "choicesResponseTimePercentiles"){
        choiceContainer = $("#choicesResponseTimePercentiles");
        refreshResponseTimePercentiles();
    } else if(id == "choicesActiveThreadsOverTime"){
        choiceContainer = $("#choicesActiveThreadsOverTime");
        refreshActiveThreadsOverTime(false);
    } else if ( id == "choicesTimeVsThreads"){
        choiceContainer = $("#choicesTimeVsThreads");
        refreshTimeVsThreads();
    } else if ( id == "choicesSyntheticResponseTimeDistribution"){
        choiceContainer = $("#choicesSyntheticResponseTimeDistribution");
        refreshSyntheticResponseTimeDistribution();
    } else if ( id == "choicesResponseTimeDistribution"){
        choiceContainer = $("#choicesResponseTimeDistribution");
        refreshResponseTimeDistribution();
    } else if ( id == "choicesHitsPerSecond"){
        choiceContainer = $("#choicesHitsPerSecond");
        refreshHitsPerSecond(false);
    } else if(id == "choicesCodesPerSecond"){
        choiceContainer = $("#choicesCodesPerSecond");
        refreshCodesPerSecond(false);
    } else if ( id == "choicesTransactionsPerSecond"){
        choiceContainer = $("#choicesTransactionsPerSecond");
        refreshTransactionsPerSecond(false);
    } else if ( id == "choicesTotalTPS"){
        choiceContainer = $("#choicesTotalTPS");
        refreshTotalTPS(false);
    } else if ( id == "choicesResponseTimeVsRequest"){
        choiceContainer = $("#choicesResponseTimeVsRequest");
        refreshResponseTimeVsRequest();
    } else if ( id == "choicesLatencyVsRequest"){
        choiceContainer = $("#choicesLatencyVsRequest");
        refreshLatenciesVsRequest();
    }
    var color = checked ? "black" : "#818181";
    if(choiceContainer != null) {
        choiceContainer.find("label").each(function(){
            this.style.color = color;
        });
    }
}

