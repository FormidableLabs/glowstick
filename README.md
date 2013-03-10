TODO: adapt jQuery promises interface to this

## Colors

All colors are specified in an RGB array in this format:

    [255, 255, 255]

## Time



## Board

### at **board.at(index)**

can be index or x y

### row **board.row(index)**
    
    var pixels = board.row(0);

### column **board.column(index)**

    var pixels = board.column(0);

### all **board.all()**
  
    var pixels = board.all();

### clear **board.clear()**

### on

### off

### trigger

## Pixels

### each

### add

    var pixels = board.select(0, 6);
    pixels.add(board.select(7, 9));

### filter
    
    var pixels = board.select(0, 6);
    pixels.filter(function(pixel, i) {
      return i % 2 === 0;
    });

### eq

### toArray

### first

first in set (not in board)

### last

last in set (not in board)

### has

### next **pixels.next({wrap: true})**

### previous **pixels.previous({wrap: true})**

### above **pixels.above({wrap: true})*

### below **pixels.below({wrap: true})*

### left **pixels.left({wrap: true})*

### right **pixels.right({wrap: true})*

### set **pixels.set([r, g, b])**

### fade **pixels.fade([from,] to, duration, callback)**

`from` is an optional 

### after **pixels.after(timeout, callback)**

Accepts arguments in any order.

    var pixel = board.select(0);
    function walk() {
      pixel.on().after(100, function() {
        pixel.off();
        pixel = pixel.next();
        walk();
      });
    }
    walk();



    board.all().on();

    var pixel = board.select(0);
    function walk() {
      pixel.fade([255, 255, 255], [128, 128, 128], 0.5, )

      pixel.on().after(100, function() {
        pixel.off();
        pixel = pixel.next({wrap: true});
        walk();
      });
    }
    walk();

### on

### off


### Pixel

An individual pixel can be accessed via the array index either through the `board` object, or a `pixels object:

    var pixel = board[0];
    var pixels = board.select(0)
