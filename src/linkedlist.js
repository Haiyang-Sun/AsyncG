//DO NOT INSTRUMENT
/*******************************************************************************
 * Copyright 2018 Dynamic Analysis Group, Università della Svizzera Italiana (USI)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/

// Author Haiyang Sun

function ListNode(val){
  this.val = val;
  this.next = undefined;
  this.prev = undefined;
}

function LinkedList(maxSize){
  this.head = undefined;
  this.tail = undefined;
  this.maxSize = maxSize;
  this.push = function(val) {
    var newNode = new ListNode(val);
    if(!this.head) {
      this.head = newNode;
      this.tail = newNode;
    }else {
      this.tail.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }
    this.length++;

    if(this.length > maxSize)
      this.remove(this.head);

    return newNode;
  }
  this.length = 0;
  this.dumpList = function(){
    var cur = this.head;
    while(cur) {
      cur = cur.next;
    }
  }
  this.forEach = function(handler) {
    var cur = this.head;
    while(cur) {
      var ret = handler(cur.val, cur);
      if(ret)
        break;
      cur = cur.next;
    }
  }
  this.remove = function(node) {
    this.length--;
    if(node.prev) {
      node.prev.next = node.next;
    }
    if(node.next) {
      node.next.prev = node.prev;
    }
    if(node == this.head) {
      this.head = node.next;
    }
    if(node == this.tail) {
      this.tail = node.prev;
    }
  }
}

module.exports=LinkedList;
